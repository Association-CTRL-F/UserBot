import {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
	ChannelType,
	MessageFlags
} from 'discord.js'
import { convertMinutesToString, displayNameAndID } from '../../util/util.js'

const MAX_TIMEOUT_MS = 2_147_483_647
const isValidDiscordId = (value) => /^\d{17,19}$/.test(value)

const buildMuteEmbed = (guild, muteDM, reason, duration) =>
	new EmbedBuilder()
		.setColor('#C27C0E')
		.setTitle('Mute')
		.setDescription(muteDM)
		.setAuthor({
			name: guild.name,
			iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
			url: guild.vanityURL ?? undefined,
		})
		.addFields(
			{
				name: 'Raison du mute',
				value: reason,
			},
			{
				name: 'Durée',
				value: convertMinutesToString(duration),
			},
		)

const buildUnmuteEmbed = (guild, unmuteDM) =>
	new EmbedBuilder()
		.setColor('#C27C0E')
		.setTitle('Mute terminé')
		.setDescription(unmuteDM)
		.setAuthor({
			name: guild.name,
			iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
			url: guild.vanityURL ?? undefined,
		})

const scheduleUnmute = ({ client, bdd, guildId, memberId, mutedRoleId, unmuteDM, delayMs }) =>
	globalThis.setTimeout(async () => {
		try {
			const guild =
				client.guilds.cache.get(guildId) ??
				(await client.guilds.fetch(guildId).catch(() => null))
			if (!guild) return

			const member = await guild.members.fetch(memberId).catch(() => null)

			if (member?.roles.cache.has(mutedRoleId)) {
				await member.roles.remove(mutedRoleId).catch((error) => {
					if (error.code !== RESTJSONErrorCodes.UnknownMember) console.error(error)
				})
			}

			const sql = 'DELETE FROM mute WHERE discordID = ?'
			const data = [memberId]
			const [deletedMute] = await bdd.execute(sql, data)

			if (deletedMute.affectedRows === 1 && member) {
				const embedUnmute = buildUnmuteEmbed(guild, unmuteDM)

				await member.send({ embeds: [embedUnmute] }).catch(console.error)
			}
		} catch (error) {
			console.error(error)
		}
	}, delayMs)

const muteOneMember = async ({
	member,
	interaction,
	bdd,
	mutedRoleId,
	reason,
	duration,
	muteDM,
	unmuteDM,
}) => {
	let errorDM = ''
	let dmMessage = null

	const embed = buildMuteEmbed(interaction.guild, muteDM, reason, duration)

	try {
		dmMessage = await member.send({
			embeds: [embed],
		})
	} catch (error) {
		if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
			errorDM = "\n\nℹ️ Le message privé n'a pas été envoyé car le membre les a bloqués"
		} else {
			console.error(error)
		}
	}

	const timestampStart = Math.round(Date.now() / 1000)
	const timestampEnd = timestampStart + duration * 60

	try {
		await bdd.execute('DELETE FROM mute WHERE discordID = ?', [member.id])
		await bdd.execute(
			'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)',
			[member.id, timestampStart, timestampEnd],
		)
	} catch (error) {
		if (dmMessage) await dmMessage.delete().catch(() => null)
		throw error
	}

	try {
		await member.roles.add(mutedRoleId)
	} catch (error) {
		if (dmMessage) await dmMessage.delete().catch(() => null)

		try {
			await bdd.execute('DELETE FROM mute WHERE discordID = ?', [member.id])
		} catch (deleteError) {
			console.error(deleteError)
		}

		throw error
	}

	scheduleUnmute({
		client: interaction.client,
		bdd,
		guildId: interaction.guild.id,
		memberId: member.id,
		mutedRoleId,
		unmuteDM,
		delayMs: duration * 60 * 1000,
	})

	return { errorDM }
}

export default {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Mute un ou plusieurs membres')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('member')
				.setDescription('Mute un membre')
				.addUserOption((option) =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				)
				.addStringOption((option) =>
					option.setName('raison').setDescription('Raison du mute').setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('durée')
						.setDescription('Durée du mute en minutes')
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName('thread')
						.setDescription("Création d'un thread")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('members')
				.setDescription('Mute plusieurs membres')
				.addStringOption((option) =>
					option.setName('membres').setDescription('Membres').setRequired(true),
				)
				.addStringOption((option) =>
					option.setName('raison').setDescription('Raison du mute').setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('durée')
						.setDescription('Durée du mute en minutes')
						.setRequired(true),
				),
		),

	interaction: async (interaction, client) => {
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		await interaction.deferReply()

		const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID
		if (!mutedRoleId) {
			return interaction.editReply({
				content: "Il n'y a pas de rôle Muted 😕",
			})
		}

		const reason = interaction.options.getString('raison').trim()
		const duration = interaction.options.getInteger('durée')

		if (!Number.isInteger(duration) || duration <= 0) {
			return interaction.editReply({
				content: 'La durée doit être supérieure à 0 minute 😕',
			})
		}

		const durationMs = duration * 60 * 1000
		if (durationMs > MAX_TIMEOUT_MS) {
			return interaction.editReply({
				content: 'Le délai est trop grand : supérieur à 24 jours 😬',
			})
		}

		let muteDM = ''
		try {
			const [result] = await bdd.execute('SELECT * FROM forms WHERE name = ?', ['mute'])
			muteDM = result?.[0]?.content ?? ''
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du message de mute en base de données 😬',
			})
		}

		let unmuteDM = ''
		try {
			const [result] = await bdd.execute('SELECT * FROM forms WHERE name = ?', ['unmute'])
			unmuteDM = result?.[0]?.content ?? ''
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la récupération du message d'unmute en base de données 😬",
			})
		}

		const mediationChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.MEDIATION_CHANNEL_ID,
		)

		switch (interaction.options.getSubcommand()) {
			case 'member': {
				const createThread = interaction.options.getBoolean('thread')
				const user = interaction.options.getUser('membre')
				const member = await interaction.guild.members.fetch(user.id).catch(() => null)

				if (!member) {
					return interaction.editReply({
						content:
							"Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
					})
				}

				if (member.user.bot) {
					return interaction.editReply({
						content: 'Tu ne peux pas mute un bot 😕',
					})
				}

				if (member.id === interaction.user.id) {
					return interaction.editReply({
						content: 'Tu ne peux pas te mute toi-même 😕',
					})
				}

				if (member.roles.cache.has(mutedRoleId)) {
					return interaction.editReply({
						content: 'Le membre est déjà muté 😕',
					})
				}

				if (!member.moderatable && !member.manageable) {
					return interaction.editReply({
						content: "Je n'ai pas les permissions pour mute ce membre 😬",
					})
				}

				if (createThread) {
					if (!mediationChannel || !mediationChannel.isTextBased()) {
						return interaction.editReply({
							content: "Il n'y a pas de salon médiation valide 😕",
						})
					}
				}

				let errorDM = ''
				try {
					const result = await muteOneMember({
						member,
						interaction,
						bdd,
						mutedRoleId,
						reason,
						duration,
						muteDM,
						unmuteDM,
					})
					errorDM = result.errorDM
				} catch (error) {
					if (error.code === RESTJSONErrorCodes.MissingPermissions) {
						return interaction.editReply({
							content: "Je n'ai pas les permissions pour mute ce membre 😬",
						})
					}

					console.error(error)
					return interaction.editReply({
						content: 'Une erreur est survenue lors du mute du membre 😬',
					})
				}

				if (mediationChannel?.isTextBased()) {
					if (createThread) {
						const thread = await mediationChannel.threads
							.create({
								name: `Mute de ${member.user.username}`,
								autoArchiveDuration: 24 * 60,
								type: ChannelType.PrivateThread,
								invitable: false,
							})
							.catch((error) => {
								console.error(error)
								return null
							})

						const embedMediation = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Mute simple')
							.setDescription(`${displayNameAndID(member, member.user)} est muté`)

						if (thread) {
							const buttonMediation = new ActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setLabel('Thread de discussion')
									.setStyle(ButtonStyle.Link)
									.setURL(
										`https://discord.com/channels/${interaction.guild.id}/${thread.id}`,
									),
							)

							await mediationChannel.send({
								embeds: [embedMediation],
								components: [buttonMediation],
							})

							await thread.members.add(member.id).catch(() => null)
							await thread.members.add(interaction.user.id).catch(() => null)
						} else {
							await mediationChannel.send({
								embeds: [embedMediation],
							})
						}
					} else {
						const embedMediation = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Mute simple')
							.setDescription(`${displayNameAndID(member, member.user)} est muté`)

						await mediationChannel.send({
							embeds: [embedMediation],
						})
					}
				}

				return interaction.editReply({
					content: `🔇 \`${member.user.tag}\` est muté pendant \`${convertMinutesToString(
						duration,
					)}\`\n\nRaison : ${reason}${errorDM}`,
				})
			}

			case 'members': {
				if (!mediationChannel || !mediationChannel.isTextBased()) {
					return interaction.editReply({
						content: "Il n'y a pas de salon médiation valide 😕",
					})
				}

				const rawUsers = interaction.options.getString('membres')
				const userIds = [
					...new Set(
						rawUsers
							.split(/[\s,]+/)
							.map((id) => id.trim())
							.filter(Boolean),
					),
				]

				if (userIds.length < 2) {
					return interaction.editReply({
						content: "Tu n'as pas mute plusieurs membres 😕",
					})
				}

				const invalidIds = userIds.filter((id) => !isValidDiscordId(id))
				if (invalidIds.length) {
					return interaction.editReply({
						content: `ID invalide(s) : \`${invalidIds.join('`, `')}\` 😕`,
					})
				}

				const members = await Promise.all(
					userIds.map((id) => interaction.guild.members.fetch(id).catch(() => null)),
				)

				if (members.some((member) => !member)) {
					return interaction.editReply({
						content:
							'Un ou plusieurs utilisateurs sont introuvables, vérifie les IDs 😕',
					})
				}

				const resolvedMembers = members

				if (resolvedMembers.some((member) => member.user.bot)) {
					return interaction.editReply({
						content: 'Tu ne peux pas mute un bot 😕',
					})
				}

				if (resolvedMembers.some((member) => member.id === interaction.user.id)) {
					return interaction.editReply({
						content: 'Tu ne peux pas te mute toi-même 😕',
					})
				}

				const alreadyMuted = resolvedMembers.filter((member) =>
					member.roles.cache.has(mutedRoleId),
				)
				if (alreadyMuted.length) {
					return interaction.editReply({
						content:
							'Un ou plusieurs membres sont déjà mutés, merci de les retirer de la liste 😬',
					})
				}

				if (resolvedMembers.some((member) => !member.moderatable && !member.manageable)) {
					return interaction.editReply({
						content: "Je n'ai pas les permissions pour mute un ou plusieurs membres 😬",
					})
				}

				const mutedMembers = []
				let errorDMGroup = ''

				try {
					for (const member of resolvedMembers) {
						const result = await muteOneMember({
							member,
							interaction,
							bdd,
							mutedRoleId,
							reason,
							duration,
							muteDM,
							unmuteDM,
						})

						if (result.errorDM) errorDMGroup = result.errorDM
						mutedMembers.push(member)
					}
				} catch (error) {
					if (error.code === RESTJSONErrorCodes.MissingPermissions) {
						return interaction.editReply({
							content:
								"Je n'ai pas les permissions pour mute un ou plusieurs membres 😬",
						})
					}

					console.error(error)
					return interaction.editReply({
						content:
							'Une erreur est survenue lors du mute d’un ou plusieurs membres 😬',
					})
				}

				const threadGroup = await mediationChannel.threads
					.create({
						name: 'Mute groupé',
						autoArchiveDuration: 24 * 60,
						type: ChannelType.PrivateThread,
						invitable: false,
					})
					.catch((error) => {
						console.error(error)
						return null
					})

				if (threadGroup) {
					await threadGroup.members.add(interaction.user.id).catch(() => null)

					for (const member of mutedMembers) {
						await threadGroup.members.add(member.id).catch(() => null)
					}
				}

				const mutedList = mutedMembers.map((member) => `\`${member.user.tag}\``).join(', ')
				const embedMediationGroup = new EmbedBuilder()
					.setColor('#C27C0E')
					.setTitle('Mute groupé')
					.setDescription(
						mutedMembers.length > 1
							? `${mutedList} sont mutés`
							: `${mutedList} est muté`,
					)

				if (threadGroup) {
					const buttonMediationGroup = new ActionRowBuilder().addComponents(
						new ButtonBuilder()
							.setLabel('Thread de discussion')
							.setStyle(ButtonStyle.Link)
							.setURL(
								`https://discord.com/channels/${interaction.guild.id}/${threadGroup.id}`,
							),
					)

					await mediationChannel.send({
						embeds: [embedMediationGroup],
						components: [buttonMediationGroup],
					})
				} else {
					await mediationChannel.send({
						embeds: [embedMediationGroup],
					})
				}

				return interaction.editReply({
					content: `🔇 ${mutedList} ${
						mutedMembers.length > 1 ? 'sont mutés' : 'est muté'
					} pendant \`${convertMinutesToString(duration)}\`\n\nRaison : ${reason}${errorDMGroup}`,
				})
			}
		}
	},
}
