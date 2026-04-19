import { EmbedBuilder, RESTJSONErrorCodes, PermissionsBitField, MessageFlags } from 'discord.js'
import { convertDateForDiscord, diffDate } from '../../util/util.js'

const canHandleSpamDecision = (member) => {
	if (!member) return false

	return (
		member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
		member.permissions.has(PermissionsBitField.Flags.Administrator)
	)
}

const buildScamBanDmEmbed = (guild) =>
	new EmbedBuilder()
		.setColor('#C27C0E')
		.setTitle('Scam')
		.setDescription(
			`**Vous êtes à présent banni du serveur**
Votre compte semble avoir été compromis. Pour votre sécurité, nous vous conseillons de changer vos mots de passe.
Si vous estimez que cette sanction est illégitime, vous pouvez effectuer une demande de levée de bannissement que nous étudierons à l'adresse https://moderation.ctrl-f.info`,
		)
		.setAuthor({
			name: guild.name,
			iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
			url: guild.vanityURL ?? undefined,
		})

const sendScamBanDm = async (member) => {
	let errorDM = ''
	let dmMessage = null

	if (!member) {
		return {
			dmMessage: null,
			errorDM: "\n\nℹ️ Le message privé n'a pas pu être envoyé car le membre est introuvable",
		}
	}

	try {
		dmMessage = await member.send({
			embeds: [buildScamBanDmEmbed(member.guild)],
		})
	} catch (error) {
		if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
			errorDM = "\n\nℹ️ Le message privé n'a pas été envoyé car l'utilisateur les a bloqués"
		} else {
			console.error(error)
			errorDM = "\n\nℹ️ Le message privé n'a pas pu être envoyé à cause d'une erreur inconnue"
		}
	}

	return { dmMessage, errorDM }
}

const liftSpamSanction = async (guild, userId, sanctionType, client) => {
	const member = await guild.members.fetch(userId).catch(() => null)
	if (!member) return false

	if (sanctionType === 'timeout') {
		if (!member.moderatable) return false

		await member.timeout(null, 'Sanction automatique levée par la modération')
		return true
	}

	if (sanctionType === 'mute_role') {
		const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID
		if (!mutedRoleId || !member.roles.cache.has(mutedRoleId)) return false

		await member.roles.remove(mutedRoleId, 'Sanction automatique levée par la modération')
		return true
	}

	return false
}

const clearSpamSanctionBeforeBan = async (guild, userId, sanctionType, client) => {
	const member = await guild.members.fetch(userId).catch(() => null)
	if (!member) return

	if (sanctionType === 'timeout' && member.isCommunicationDisabled()) {
		if (member.moderatable) {
			await member.timeout(null, 'Timeout retiré avant bannissement').catch(() => null)
		}
	}

	if (sanctionType === 'mute_role') {
		const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID

		if (mutedRoleId && member.roles.cache.has(mutedRoleId)) {
			await member.roles
				.remove(mutedRoleId, 'Muted retiré avant bannissement')
				.catch(() => null)
		}
	}
}

const parseCustomId = (customId) => {
	const [prefix, action, reportId] = customId.split(':')
	if (prefix !== 'spam-action' || !action || !reportId) return null

	return { action, reportId }
}

export default {
	data: {
		name: 'spam-action',
	},
	interaction: async (interaction, client) => {
		const parsed = parseCustomId(interaction.customId)
		if (!parsed) return

		if (!canHandleSpamDecision(interaction.member)) {
			return interaction.reply({
				content: "Tu n'as pas les permissions pour traiter ce signalement 😬",
				flags: MessageFlags.Ephemeral,
			})
		}

		const bddUserbot = client.config.db.pools.userbot
		if (!bddUserbot) {
			return interaction.reply({
				content: 'Base de données UserBot indisponible 😬',
				flags: MessageFlags.Ephemeral,
			})
		}

		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration) {
			return interaction.reply({
				content: 'Base de données Moderation indisponible 😬',
				flags: MessageFlags.Ephemeral,
			})
		}

		const { action, reportId } = parsed

		let report = null
		try {
			const sql = 'SELECT * FROM spam_reports WHERE report_id = ?'
			const data = [reportId]
			const [result] = await bddUserbot.execute(sql, data)
			report = result?.[0] ?? null
		} catch (error) {
			console.error(error)
			return interaction.reply({
				content: 'Erreur lors de la lecture du signalement 😬',
				flags: MessageFlags.Ephemeral,
			})
		}

		if (!report) {
			return interaction.reply({
				content: 'Signalement introuvable 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		if (report.status !== 'pending') {
			return interaction.reply({
				content: 'Une décision a déjà été prise pour ce signalement 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		const updatedEmbed = new EmbedBuilder(interaction.message.embeds[0]?.data ?? {})
		const now = Math.round(Date.now() / 1000)

		if (action === 'ban') {
			const member = await interaction.guild.members.fetch(report.user_id).catch(() => null)

			await clearSpamSanctionBeforeBan(
				interaction.guild,
				report.user_id,
				report.sanction_type,
				client,
			)

			const { dmMessage, errorDM } = await sendScamBanDm(member)

			try {
				await interaction.guild.members.ban(report.user_id, {
					deleteMessageSeconds: 7 * 86400,
					reason: `Spam cross-salons validé par ${interaction.user.tag}`,
				})
			} catch (error) {
				if (dmMessage) {
					await dmMessage.delete().catch(() => null)
				}

				if (error.code === RESTJSONErrorCodes.MissingPermissions) {
					return interaction.reply({
						content: "Je n'ai pas les permissions pour bannir ce membre 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				console.error(error)
				return interaction.reply({
					content: 'Impossible de bannir ce membre 😬',
					flags: MessageFlags.Ephemeral,
				})
			}

			try {
				const sql =
					'UPDATE spam_reports SET status = ?, handled_by = ?, handled_at = ? WHERE report_id = ?'
				const data = ['banned', interaction.user.id, now, reportId]
				await bddUserbot.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			const targetUser =
				member?.user ?? (await client.users.fetch(report.user_id).catch(() => null))
			const targetTag = targetUser?.tag ?? report.user_id
			const targetUsername = targetUser?.username ?? report.user_id
			const targetAvatar = targetUser?.avatar ?? null

			const logsChannel = interaction.guild.channels.cache.get(
				client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
			)

			const logEmbed = new EmbedBuilder()
				.setColor('#C9572A')
				.setAuthor({
					name: `${targetTag} (ID : ${report.user_id})`,
					iconURL: targetUser?.displayAvatarURL({ dynamic: true }) ?? undefined,
				})
				.setDescription(
					`\`\`\`\n${interaction.user.tag} : spam cross-salons validé manuellement\n\`\`\``,
				)
				.setFooter({
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					text: `Membre banni par ${interaction.user.tag}`,
				})
				.setTimestamp(new Date())

			if (targetUser) {
				logEmbed.addFields(
					{
						name: 'Mention',
						value: targetUser.toString(),
						inline: true,
					},
					{
						name: 'Date de création du compte',
						value: convertDateForDiscord(targetUser.createdAt),
						inline: true,
					},
					{
						name: 'Âge du compte',
						value: diffDate(targetUser.createdAt),
						inline: true,
					},
				)
			} else {
				logEmbed.addFields({
					name: 'Utilisateur',
					value: `<@${report.user_id}> (ID : ${report.user_id})`,
					inline: true,
				})
			}

			try {
				const sql =
					'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
				const data = [
					report.user_id,
					targetUsername,
					targetAvatar,
					interaction.user.id,
					interaction.user.username,
					'spam cross-salons validé manuellement',
					now,
				]

				await bddModeration.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			if (logsChannel?.isTextBased()) {
				await logsChannel.send({ embeds: [logEmbed] }).catch(console.error)
			}

			updatedEmbed
				.setColor('#C9572A')
				.addFields({
					name: 'Décision modération',
					value: `Ban validé par ${interaction.user}${errorDM}`,
					inline: false,
				})
				.setFooter({
					text: `Décision prise par ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})

			return interaction.update({
				embeds: [updatedEmbed],
				components: [],
			})
		}

		if (action === 'lift') {
			let lifted = false

			try {
				lifted = await liftSpamSanction(
					interaction.guild,
					report.user_id,
					report.sanction_type,
					client,
				)
			} catch (error) {
				console.error(error)
				return interaction.reply({
					content: 'Impossible de retirer la sanction 😬',
					flags: MessageFlags.Ephemeral,
				})
			}

			try {
				const sql =
					'UPDATE spam_reports SET status = ?, handled_by = ?, handled_at = ? WHERE report_id = ?'
				const data = ['lifted', interaction.user.id, now, reportId]
				await bddUserbot.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			updatedEmbed
				.setColor('#57C92A')
				.addFields({
					name: 'Décision modération',
					value: lifted
						? `Sanction retirée par ${interaction.user}`
						: `Aucune sanction active à retirer pour ${interaction.user}`,
					inline: false,
				})
				.setFooter({
					text: `Décision prise par ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})

			return interaction.update({
				embeds: [updatedEmbed],
				components: [],
			})
		}

		if (action === 'keep') {
			try {
				const sql =
					'UPDATE spam_reports SET status = ?, handled_by = ?, handled_at = ? WHERE report_id = ?'
				const data = ['kept', interaction.user.id, now, reportId]
				await bddUserbot.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			updatedEmbed
				.setColor('#F1C40F')
				.addFields({
					name: 'Décision modération',
					value: `Sanction conservée par ${interaction.user}`,
					inline: false,
				})
				.setFooter({
					text: `Décision prise par ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})

			return interaction.update({
				embeds: [updatedEmbed],
				components: [],
			})
		}

		return interaction.reply({
			content: 'Action inconnue 😕',
			flags: MessageFlags.Ephemeral,
		})
	},
}
