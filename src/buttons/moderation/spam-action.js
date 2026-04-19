import { EmbedBuilder, RESTJSONErrorCodes, PermissionsBitField, MessageFlags } from 'discord.js'

const canHandleSpamDecision = (member) => {
	if (!member) return false

	return (
		member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
		member.permissions.has(PermissionsBitField.Flags.Administrator)
	)
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
			})
		}

		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.reply({
				content: 'Base de données indisponible 😬',
			})
		}

		const { action, reportId } = parsed

		let report = null
		try {
			const sql = 'SELECT * FROM spam_reports WHERE report_id = ?'
			const data = [reportId]
			const [result] = await bdd.execute(sql, data)
			report = result?.[0] ?? null
		} catch (error) {
			console.error(error)
			return interaction.reply({
				content: 'Erreur lors de la lecture du signalement 😬',
			})
		}

		if (!report) {
			return interaction.reply({
				content: 'Signalement introuvable 😕',
			})
		}

		if (report.status !== 'pending') {
			return interaction.reply({
				content: 'Une décision a déjà été prise pour ce signalement 😕',
			})
		}

		const updatedEmbed = new EmbedBuilder(interaction.message.embeds[0]?.data ?? {})
		const now = Math.round(Date.now() / 1000)

		if (action === 'ban') {
			try {
				await interaction.guild.members.ban(report.user_id, {
					deleteMessageSeconds: 7 * 86400,
					reason: `Spam cross-salons validé par ${interaction.user.tag}`,
				})
			} catch (error) {
				if (error.code === RESTJSONErrorCodes.MissingPermissions) {
					return interaction.reply({
						content: "Je n'ai pas les permissions pour bannir ce membre 😬",
					})
				}

				console.error(error)
				return interaction.reply({
					content: 'Impossible de bannir ce membre 😬',
				})
			}

			try {
				const sql =
					'UPDATE spam_reports SET status = ?, handled_by = ?, handled_at = ? WHERE report_id = ?'
				const data = ['banned', interaction.user.id, now, reportId]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			updatedEmbed
				.setColor('#C9572A')
				.addFields({
					name: 'Décision modération',
					value: `Ban validé par ${interaction.user}`,
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
				})
			}

			try {
				const sql =
					'UPDATE spam_reports SET status = ?, handled_by = ?, handled_at = ? WHERE report_id = ?'
				const data = ['lifted', interaction.user.id, now, reportId]
				await bdd.execute(sql, data)
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
				await bdd.execute(sql, data)
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
		})
	},
}
