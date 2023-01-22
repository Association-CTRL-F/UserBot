/* eslint-disable default-case */
/* eslint-disable no-case-declarations */
/* eslint-disable no-mixed-operators */
import {
	SlashCommandBuilder,
	GuildMember,
	EmbedBuilder,
	RESTJSONErrorCodes,
	ChannelType,
} from 'discord.js'
import { convertMinutesToString, displayNameAndID } from '../../util/util.js'
import ms from 'ms'

export default {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Mute un ou plusieurs membres')
		.addSubcommand(subcommand =>
			subcommand
				.setName('member')
				.setDescription('Mute un membre')
				.addUserOption(option =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				)
				.addStringOption(option =>
					option.setName('raison').setDescription('Raison du mute').setRequired(true),
				)
				.addIntegerOption(option =>
					option
						.setName('durée')
						.setDescription('Durée du mute en minutes')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('members')
				.setDescription('Mute plusieurs membres')
				.addStringOption(option =>
					option.setName('membres').setDescription('Membres').setRequired(true),
				)
				.addStringOption(option =>
					option.setName('raison').setDescription('Raison du mute').setRequired(true),
				)
				.addIntegerOption(option =>
					option
						.setName('durée')
						.setDescription('Durée du mute en minutes')
						.setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Acquisition du rôle muted
		const mutedRole = client.config.guild.roles.MUTED_ROLE_ID
		if (!mutedRole)
			return interaction.editReply({
				content: "Il n'y a pas de rôle Muted 😕",
			})

		// Acquisition de la raison du mute et de sa durée
		const reason = interaction.options.getString('raison')
		const duration = interaction.options.getInteger('durée')

		// Acquisition du message de mute
		let muteDM = ''
		try {
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = ['mute']
			const [result] = await bdd.execute(sql, data)

			muteDM = result[0].content
		} catch {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du message de mute en base de données 😬',
			})
		}

		// Acquisition du message d'unmute
		let unmuteDM = ''
		try {
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = ['unmute']
			const [result] = await bdd.execute(sql, data)

			unmuteDM = result[0].content
		} catch {
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la récupération du message d'unmute en base de données 😬",
			})
		}

		// Acquisition du salon tribunal
		const tribunalChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.TRIBUNAL_CHANNEL_ID,
		)

		switch (interaction.options.getSubcommand()) {
			case 'member':
				// Acquisition du membre
				const user = interaction.options.getUser('membre')
				const member = interaction.guild.members.cache.get(user.id)
				if (!member)
					return interaction.editReply({
						content:
							"Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
					})

				// Vérification si le membre a déjà le rôle muted
				if (member.roles.cache.has(mutedRole))
					return interaction.editReply({
						content: 'Le membre est déjà muté 😕',
					})

				// On ne peut pas se mute soi-même
				if (member.id === interaction.user.id)
					return interaction.editReply({
						content: 'Tu ne peux pas te mute toi-même 😕',
					})

				if (ms(duration).toString(2).length > 31)
					return interaction.reply({
						content: 'Le délai est trop grand : supérieur à 24 jours 😬',
						ephemeral: true,
					})

				// Envoi du message de mute en message privé
				let errorDM = ''

				const embed = new EmbedBuilder()
					.setColor('#C27C0E')
					.setTitle('Mute')
					.setDescription(muteDM)
					.setAuthor({
						name: interaction.guild.name,
						iconURL: interaction.guild.iconURL({ dynamic: true }),
						url: interaction.guild.vanityURL,
					})
					.addFields([
						{
							name: 'Raison du mute',
							value: reason,
						},
						{
							name: 'Durée',
							value: convertMinutesToString(duration),
						},
					])

				const DMMessage = await member
					.send({
						embeds: [embed],
					})
					.catch(error => {
						if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser)
							errorDM =
								"\n\nℹ️ Le message privé n'a pas été envoyé car le membre les a bloqué"
					})

				// Vérification si déjà mute en base de données
				let muted = {}
				try {
					const sql = 'SELECT * FROM mute WHERE discordID = ?'
					const data = [member.id]
					const [result] = await bdd.execute(sql, data)
					muted = result[0]
				} catch {
					if (DMMessage) DMMessage.delete()
					return interaction.editReply({
						content:
							'Une erreur est survenue lors du mute du membre en base de données 😬',
					})
				}

				// Si oui alors on lève le mute en base de données
				if (muted)
					try {
						const sql = 'DELETE FROM mute WHERE discordID = ?'
						const data = [member.id]
						await bdd.execute(sql, data)
					} catch {
						if (DMMessage) DMMessage.delete()
						return interaction.editReply({
							content:
								'Une erreur est survenue lors du mute du membre en base de données 😬',
						})
					}

				// Insertion du nouveau mute en base de données
				try {
					const sql =
						'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
					const data = [
						member.id,
						Math.round(Date.now() / 1000),
						Math.round(Date.now() / 1000) + duration * 60,
					]

					await bdd.execute(sql, data)
				} catch {
					if (DMMessage) DMMessage.delete()
					return interaction.editReply({
						content:
							'Une erreur est survenue lors du mute du membre en base de données 😬',
					})
				}

				// Action de mute du membre
				const muteAction = await member.roles.add(mutedRole).catch(error => {
					if (DMMessage) DMMessage.delete()
					try {
						const sql = 'DELETE FROM mute WHERE discordID = ?'
						const data = [member.id]

						bdd.execute(sql, data)
					} catch {
						console.error(error)
						return interaction.editReply({
							content: 'Une erreur est survenue lors du mute du membre 😬',
						})
					}

					if (error.code === RESTJSONErrorCodes.MissingPermissions)
						return interaction.editReply({
							content: "Je n'ai pas les permissions pour mute ce membre 😬",
						})

					console.error(error)
					return interaction.editReply({
						content: 'Une erreur est survenue lors du mute du membre 😬',
					})
				})

				const removeRole = async () => {
					if (!member.roles.cache.has(mutedRole)) return
					member.roles.remove(mutedRole).catch(error => {
						if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
					})

					// Suppression du mute en base de données
					let deletedMute = {}
					try {
						const sql = 'DELETE FROM mute WHERE discordID = ?'
						const data = [member.id]
						const [result] = await bdd.execute(sql, data)
						deletedMute = result
					} catch (error) {
						console.error(error)
						return interaction.editReply({
							content:
								'Une erreur est survenue lors de la levé du mute du membre en base de données 😬',
						})
					}

					// Si pas d'erreur, envoi du message privé
					const embedUnmute = new EmbedBuilder()
						.setColor('#C27C0E')
						.setTitle('Mute terminé')
						.setDescription(unmuteDM)
						.setAuthor({
							name: interaction.guild.name,
							iconURL: interaction.guild.iconURL({ dynamic: true }),
							url: interaction.guild.vanityURL,
						})

					if (deletedMute.affectedRows === 1)
						member
							.send({
								embeds: [embedUnmute],
							})
							.catch(error => {
								console.error(error)
							})
				}

				// Suppression du rôle muted après le temps écoulé
				// et envoi du message privé
				setTimeout(removeRole, duration * 60000)

				// Si pas d'erreur, message de confirmation du mute
				if (muteAction instanceof GuildMember) {
					const thread = await tribunalChannel.threads.create({
						name: `Mute de ${member.user.username}`,
						autoArchiveDuration: 24 * 60,
						type: ChannelType.PrivateThread,
						invitable: false,
					})

					await tribunalChannel.send({
						content: `Mute de \`${displayNameAndID(
							member,
						)}\`\nhttps://discord.com/channels/${interaction.guild.id}/${thread.id}`,
					})

					await thread.members.add(member.id)
					await thread.members.add(interaction.user.id)

					return interaction.editReply({
						content: `🔇 \`${
							member.user.tag
						}\` est muté pendant \`${convertMinutesToString(
							duration,
						)}\`\n\nRaison : ${reason}${errorDM}`,
					})
				}

				// Si au moins une erreur, throw
				if (muteAction instanceof Error || DMMessage instanceof Error)
					throw new Error(
						"L'envoi d'un message et / ou le mute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
					)

				return

			case 'members':
				// Acquisition des membres
				const users = interaction.options.getString('membres')
				const usersArray = users.split(',')
				let muteMessage = ''
				let errorDMGroup = ''

				const threadGroup = await tribunalChannel.threads.create({
					name: `Mute groupé`,
					autoArchiveDuration: 24 * 60,
					type: ChannelType.PrivateThread,
					invitable: false,
				})

				await tribunalChannel.send({
					content: `Mute groupé\nhttps://discord.com/channels/${interaction.guild.id}/${threadGroup.id}`,
				})

				await Promise.all(
					usersArray.map(async userGroup => {
						// Acquisition du membre
						const memberGroup = await interaction.guild.members.fetch(userGroup)
						if (!memberGroup) return

						// Vérification si le membre a déjà le rôle muted
						if (memberGroup.roles.cache.has(mutedRole)) return

						// On ne peut pas se mute soi-même
						if (memberGroup.id === interaction.user.id)
							return interaction.editReply({
								content: 'Tu ne peux pas te mute toi-même 😕',
							})

						// Envoi du message de mute en message privé
						const embedMuteGroup = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Mute')
							.setDescription(muteDM)
							.setAuthor({
								name: interaction.guild.name,
								iconURL: interaction.guild.iconURL({ dynamic: true }),
								url: interaction.guild.vanityURL,
							})
							.addFields([
								{
									name: 'Raison du mute',
									value: reason,
								},
								{
									name: 'Durée',
									value: convertMinutesToString(duration),
								},
							])

						const DMMessageGroup = await memberGroup
							.send({
								embeds: [embedMuteGroup],
							})
							.catch(error => {
								if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser)
									errorDMGroup =
										"\n\nℹ️ Le message privé n'a pas été envoyé à certains membres car ils les ont bloqué"
							})

						// Vérification si déjà mute en base de données
						let mutedGroup = {}
						try {
							const sql = 'SELECT * FROM mute WHERE discordID = ?'
							const data = [memberGroup.id]
							const [result] = await bdd.execute(sql, data)
							mutedGroup = result[0]
						} catch {
							if (DMMessageGroup) DMMessageGroup.delete()
							return interaction.editReply({
								content:
									'Une erreur est survenue lors du mute du membre en base de données 😬',
							})
						}

						// Si oui alors on lève le mute en base de données
						if (mutedGroup)
							try {
								const sql = 'DELETE FROM mute WHERE discordID = ?'
								const data = [memberGroup.id]
								await bdd.execute(sql, data)
							} catch {
								if (DMMessageGroup) DMMessageGroup.delete()
								return interaction.editReply({
									content:
										'Une erreur est survenue lors du mute du membre en base de données 😬',
								})
							}

						// Insertion du nouveau mute en base de données
						try {
							const sql =
								'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
							const data = [
								memberGroup.id,
								Math.round(Date.now() / 1000),
								Math.round(Date.now() / 1000) + duration * 60,
							]

							await bdd.execute(sql, data)
						} catch {
							if (DMMessageGroup) DMMessageGroup.delete()
							return interaction.editReply({
								content:
									'Une erreur est survenue lors du mute du membre en base de données 😬',
							})
						}

						// Action de mute du membre
						const muteActionGroup = await memberGroup.roles
							.add(mutedRole)
							.catch(error => {
								if (DMMessageGroup) DMMessageGroup.delete()
								try {
									const sql = 'DELETE FROM mute WHERE discordID = ?'
									const data = [memberGroup.id]

									bdd.execute(sql, data)
								} catch {
									console.error(error)
									return interaction.editReply({
										content:
											'Une erreur est survenue lors du mute du membre 😬',
									})
								}

								if (error.code === RESTJSONErrorCodes.MissingPermissions)
									return interaction.editReply({
										content:
											"Je n'ai pas les permissions pour mute ce membre 😬",
									})

								console.error(error)
								return interaction.editReply({
									content: 'Une erreur est survenue lors du mute du membre 😬',
								})
							})

						// Suppression du rôle muted après le temps écoulé
						// et envoi du message privé
						const removeRoleGroup = async () => {
							if (!memberGroup.roles.cache.has(mutedRole)) return
							memberGroup.roles.remove(mutedRole).catch(error => {
								if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
							})

							// Suppression du mute en base de données
							let deletedMute = {}
							try {
								const sql = 'DELETE FROM mute WHERE discordID = ?'
								const data = [memberGroup.id]
								const [result] = await bdd.execute(sql, data)
								deletedMute = result
							} catch (error) {
								console.error(error)
								return interaction.editReply({
									content:
										'Une erreur est survenue lors de la levé du mute du membre en base de données 😬',
								})
							}

							// Si pas d'erreur, envoi du message privé
							const embedUnmuteGroup = new EmbedBuilder()
								.setColor('#C27C0E')
								.setTitle('Mute terminé')
								.setDescription(unmuteDM)
								.setAuthor({
									name: interaction.guild.name,
									iconURL: interaction.guild.iconURL({ dynamic: true }),
									url: interaction.guild.vanityURL,
								})

							if (deletedMute.affectedRows === 1)
								memberGroup
									.send({
										embeds: [embedUnmuteGroup],
									})
									.catch(error => {
										console.error(error)
									})
						}

						setTimeout(removeRoleGroup, duration * 60000)

						// Si pas d'erreur, message de confirmation du mute
						if (muteActionGroup instanceof GuildMember) {
							await threadGroup.members.add(memberGroup.id)
							muteMessage = muteMessage.concat(' ', `\`${memberGroup.user.tag}\`,`)
						}

						// Si au moins une erreur, throw
						if (muteActionGroup instanceof Error || DMMessageGroup instanceof Error)
							throw new Error(
								"L'envoi d'un message et / ou le mute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
							)
					}),

					await threadGroup.members.add(interaction.user.id),
				)

				// Si pas d'erreur, message de confirmation du mute
				if (muteMessage !== '')
					return interaction.editReply({
						content: `🔇 ${muteMessage} sont mutés pendant \`${convertMinutesToString(
							duration,
						)}\`\n\nRaison : ${reason}${errorDMGroup}`,
					})

				return interaction.editReply({
					content: `🔇 Les membres sont mutés pendant \`${convertMinutesToString(
						duration,
					)}\`\n\nRaison : ${reason}${errorDMGroup}`,
				})
		}
	},
}
