/* eslint-disable default-case */
/* eslint-disable no-case-declarations */
import { SlashCommandBuilder } from '@discordjs/builders'
import { Constants, GuildMember } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('unmute')
		.setDescription('Unmute un membre')
		.addSubcommand(subcommand =>
			subcommand
				.setName('member')
				.setDescription('Mute un membre')
				.addUserOption(option =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('members')
				.setDescription('Unmute des membres')
				.addStringOption(option =>
					option.setName('membres').setDescription('Membres').setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		// Acquisition du rôle muted
		const mutedRole = client.config.guild.roles.mutedRoleID
		if (!mutedRole)
			return interaction.reply({
				content: "Il n'y a pas de rôle Muted 😕",
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition du message d'unmute
		let unmuteDM = ''
		try {
			const sqlSelectUnmute = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectUnmute = ['unmute']
			const [resultSelectUnmute] = await bdd.execute(sqlSelectUnmute, dataSelectUnmute)

			unmuteDM = resultSelectUnmute[0].content
		} catch (error) {
			console.error(error)
			return interaction.reply({
				content:
					"Une erreur est survenue lors de la récupération du message d'unmute en base de données 😬",
				ephemeral: true,
			})
		}

		switch (interaction.options.getSubcommand()) {
			case 'member':
				// Acquisition du membre
				const user = interaction.options.getUser('membre')
				const member = interaction.guild.members.cache.get(user.id)
				if (!member)
					return interaction.reply({
						content:
							"Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
						ephemeral: true,
					})

				// Vérification si le membre a bien le rôle muted
				if (!member.roles.cache.has(mutedRole))
					return interaction.reply({
						content: "Le membre n'est pas muté 😕",
						ephemeral: true,
					})

				// On ne peut pas se démute soi-même
				if (member.id === interaction.user.id)
					return interaction.reply({
						content: 'Tu ne peux pas te démute toi-même 😕',
						ephemeral: true,
					})

				// Envoi du message d'unmute en message privé
				const DMMessage = await member
					.send({
						embeds: [
							{
								color: '#C27C0E',
								title: 'Mute terminé',
								description: unmuteDM,
								author: {
									name: interaction.guild.name,
									icon_url: interaction.guild.iconURL({ dynamic: true }),
									url: interaction.guild.vanityURL,
								},
							},
						],
					})
					.catch(error => {
						console.error(error)
					})

				// Vérification si déjà mute en base de données
				let mutedMember = {}
				try {
					const sqlCheck = 'SELECT * FROM mute WHERE discordID = ?'
					const dataCheck = [member.id]
					const [resultCheck] = await bdd.execute(sqlCheck, dataCheck)

					mutedMember = resultCheck[0]
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la levé du mute du membre en base de données 😬',
						ephemeral: true,
					})
				}

				// Si oui alors on lève le mute en base de données
				if (mutedMember) {
					try {
						const sqlDelete = 'DELETE FROM mute WHERE discordID = ?'
						const dataDelete = [member.id]
						await bdd.execute(sqlDelete, dataDelete)
					} catch {
						if (DMMessage) DMMessage.delete()
						return interaction.reply({
							content:
								'Une erreur est survenue lors de la levée du mute du membre en base de données 😬',
							ephemeral: true,
						})
					}

					// Action d'unmute du membre
					const unmuteAction = await member.roles.remove(mutedRole).catch(error => {
						// Suppression du message privé envoyé
						// car action de mute non réalisée
						if (DMMessage) DMMessage.delete()

						// Réinsertion du mute en base de données
						try {
							const sql =
								'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
							const data = [
								mutedMember.discordID,
								mutedMember.timestampStart,
								mutedMember.timestampEnd,
							]

							bdd.execute(sql, data)
						} catch {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la levée du mute du membre 😬',
								ephemeral: true,
							})
						}

						if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
							return interaction.reply({
								content: "Je n'ai pas les permissions pour unmute ce membre 😬",
								ephemeral: true,
							})

						console.error(error)
						return interaction.reply({
							content:
								'Une erreur est survenue lors de la levée du mute du membre 😬',
							ephemeral: true,
						})
					})

					// Si pas d'erreur, message de confirmation de l'unmute
					if (unmuteAction instanceof GuildMember)
						return interaction.reply({
							content: `🔊 \`${member.user.tag}\` est démuté`,
						})

					// Si au moins une erreur, throw
					if (unmuteAction instanceof Error || DMMessage instanceof Error)
						throw new Error(
							"L'envoi d'un message et / ou l'unmute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
						)
				}

				// Action d'unmute du membre
				const unmuteAction = await member.roles.remove(mutedRole).catch(error => {
					// Suppression du message privé envoyé
					// car action de mute non réalisée
					if (DMMessage) DMMessage.delete()

					if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
						return interaction.reply({
							content: "Je n'ai pas les permissions pour unmute ce membre 😬",
							ephemeral: true,
						})

					console.error(error)
					return interaction.reply({
						content: 'Une erreur est survenue lors de la levée du mute du membre 😬',
						ephemeral: true,
					})
				})

				// Si pas d'erreur, message de confirmation de l'unmute
				if (unmuteAction instanceof GuildMember)
					return interaction.reply({
						content: `\`${member.user.tag}\` n'est pas muté en base de données, mais le rôle a été retiré 😬`,
					})

				// Si au moins une erreur, throw
				if (unmuteAction instanceof Error || DMMessage instanceof Error)
					throw new Error(
						"L'envoi d'un message et / ou l'unmute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
					)

				return

			case 'members':
				// Acquisition des membres
				const users = interaction.options.getString('membres')
				const usersArray = users.split(',')
				let unmuteMessage = ''

				await Promise.all(
					usersArray.map(async userGroup => {
						// Acquisition du membre
						const memberGroup = await interaction.guild.members.fetch(userGroup)
						if (!memberGroup) return

						// Vérification si le membre a déjà le rôle muted
						if (!memberGroup.roles.cache.has(mutedRole)) return

						// On ne peut pas se mute soi-même
						// if (memberGroup.id === interaction.user.id)
						// 	return interaction.reply({
						// 		content: "Tu ne peux pas t'unmute toi-même 😕",
						// 		ephemeral: true,
						// 	})

						// Envoi du message d'unmute en message privé
						const DMMessageGroup = await memberGroup
							.send({
								embeds: [
									{
										color: '#C27C0E',
										title: 'Mute terminé',
										description: unmuteDM,
										author: {
											name: interaction.guild.name,
											icon_url: interaction.guild.iconURL({ dynamic: true }),
											url: interaction.guild.vanityURL,
										},
									},
								],
							})
							.catch(error => {
								console.error(error)
							})

						// Vérification si déjà mute en base de données
						let mutedGroup = {}
						try {
							const sqlCheck = 'SELECT * FROM mute WHERE discordID = ?'
							const dataCheck = [memberGroup.id]
							const [resultCheck] = await bdd.execute(sqlCheck, dataCheck)
							mutedGroup = resultCheck[0]
						} catch {
							if (DMMessageGroup) DMMessageGroup.delete()
							return interaction.reply({
								content:
									"Une erreur est survenue lors de l'unmute du membre en base de données 😬",
								ephemeral: true,
							})
						}

						// Si oui alors on lève le mute en base de données
						if (mutedGroup) {
							try {
								const sqlDelete = 'DELETE FROM mute WHERE discordID = ?'
								const dataDelete = [memberGroup.id]
								await bdd.execute(sqlDelete, dataDelete)
							} catch {
								if (DMMessageGroup) DMMessageGroup.delete()
								return interaction.reply({
									content:
										"Une erreur est survenue lors de l'unmute du membre en base de données 😬",
									ephemeral: true,
								})
							}

							// Action d'unmute du membre
							const unmuteActionGroup = await memberGroup.roles
								.remove(mutedRole)
								.catch(error => {
									// Suppression du message privé envoyé
									// car action de mute non réalisée
									if (DMMessageGroup) DMMessageGroup.delete()

									// Réinsertion du mute en base de données
									try {
										const sql =
											'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
										const data = [
											mutedGroup.discordID,
											mutedGroup.timestampStart,
											mutedGroup.timestampEnd,
										]

										bdd.execute(sql, data)
									} catch {
										return interaction.reply({
											content:
												'Une erreur est survenue lors de la levée du mute du membre 😬',
											ephemeral: true,
										})
									}

									if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
										return interaction.reply({
											content:
												"Je n'ai pas les permissions pour unmute ce membre 😬",
											ephemeral: true,
										})

									console.error(error)
									return interaction.reply({
										content:
											'Une erreur est survenue lors de la levée du mute du membre 😬',
										ephemeral: true,
									})
								})

							// Si pas d'erreur,
							// message de confirmation de l'unmute
							if (unmuteActionGroup instanceof GuildMember)
								unmuteMessage = unmuteMessage.concat(
									' ',
									`\`${memberGroup.user.tag}\`,`,
								)

							// Si au moins une erreur, throw
							if (
								unmuteActionGroup instanceof Error ||
								DMMessageGroup instanceof Error
							)
								throw new Error(
									"L'envoi d'un message et / ou l'unmute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
								)
						}

						// Action d'unmute du membre
						const unmuteActionGroup = await memberGroup.roles
							.remove(mutedRole)
							.catch(error => {
								// Suppression du message privé envoyé
								// car action de mute non réalisée
								if (DMMessageGroup) DMMessageGroup.delete()

								if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
									return interaction.reply({
										content:
											"Je n'ai pas les permissions pour unmute ce membre 😬",
										ephemeral: true,
									})

								console.error(error)
								return interaction.reply({
									content:
										'Une erreur est survenue lors de la levée du mute du membre 😬',
									ephemeral: true,
								})
							})

						// Si pas d'erreur, message de confirmation de l'unmute
						if (unmuteActionGroup instanceof GuildMember)
							unmuteMessage = unmuteMessage.concat(
								' ',
								`\`${memberGroup.user.tag}\`,`,
							)

						// Si au moins une erreur, throw
						if (unmuteActionGroup instanceof Error || DMMessageGroup instanceof Error)
							throw new Error(
								"L'envoi d'un message et / ou l'unmute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
							)
					}),
				)

				// Si pas d'erreur, message de confirmation du mute
				if (unmuteMessage !== '')
					return interaction.reply({
						content: `🔊 ${unmuteMessage} sont démutés`,
					})

				return interaction.reply({
					content: `🔊 Les membres sont démutés`,
				})
		}
	},
}
