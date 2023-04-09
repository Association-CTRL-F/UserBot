/* eslint-disable max-depth */
/* eslint-disable default-case */
/* eslint-disable no-case-declarations */
import {
	InteractionType,
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
} from 'discord.js'

export default async (interaction, client) => {
	switch (interaction.type) {
		case InteractionType.ApplicationCommand:
			if (interaction.commandType === 1) {
				const command = client.commands.get(interaction.commandName)
				if (!command)
					return interaction.reply({
						content: `Impossible de trouver la commande "${interaction.commandName}"`,
						ephemeral: true,
					})

				return command.interaction(interaction, client)
			}

			const contextMenu = client.contextmenus.get(interaction.commandName)
			if (!contextMenu)
				return interaction.reply({
					content: `Impossible de trouver le context-menu "${interaction.commandName}"`,
					ephemeral: true,
				})

			return contextMenu.interaction(interaction, client)

		case InteractionType.ModalSubmit:
			const modal = client.modals.get(interaction.customId)
			if (!modal)
				return interaction.reply({
					content: `Impossible de trouver la modal "${interaction.customId}"`,
					ephemeral: true,
				})

			return modal.interaction(interaction, client)

		case InteractionType.MessageComponent:
			if (interaction.componentType === 2) {
				if (interaction.customId.startsWith('ticket-')) {
					// Cas du système de clôture de ticket
					const regexTicket = /ticket-([A-Z0-9]{6})/
					const ticketId = interaction.customId.match(regexTicket)[1]

					if (ticketId) {
						// Acquisition de la base de données
						const bdd = client.config.db.pools.userbot
						if (!bdd)
							return interaction.reply(
								'Une erreur est survenue lors de la connexion à la base de données',
							)

						// Récupération du ticket
						let ticket = ''
						try {
							const sql = 'SELECT * FROM tickets WHERE ticketId = ?'
							const data = [ticketId]
							const [result] = await bdd.execute(sql, data)

							ticket = result[0]
						} catch {
							return console.log(
								'Une erreur est survenue lors de la récupération du ticket en base de données (Automod)',
							)
						}

						// Fetch du membre
						const member = await interaction.guild.members.cache.get(ticket.userId)

						// Fetch du message
						const message = await interaction.channel.messages
							.fetch(interaction.message.id)
							.catch(error => {
								if (error.code === RESTJSONErrorCodes.UnknownMessage) {
									interaction.reply({
										content:
											"Je n'ai pas trouvé le message dans le salon tickets 😕",
										ephemeral: true,
									})

									return error
								}

								throw error
							})

						// Création de l'embed ticket clôturé
						const embedCloseTicket = new EmbedBuilder()
							.setColor('#C9572A')
							.setTitle(`${message.embeds[0].data.title} (clôturé)`)
							.setDescription(message.embeds[0].data.description)

						const buttonCloseTicket = new ActionRowBuilder().addComponents(
							new ButtonBuilder()
								.setLabel('Thread de discussion')
								.setStyle(ButtonStyle.Link)
								.setURL(message.components[0].components[0].data.url),
						)

						// Mise à jour du ticket en base de données
						// pour le clôturer
						try {
							const sql = 'UPDATE tickets SET active = ? WHERE ticketId = ?'
							const data = [0, ticketId]

							await bdd.execute(sql, data)
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la clôture du ticket en base de données 😕',
								ephemeral: true,
							})
						}

						// Mise à jour du message
						await message.edit({
							embeds: [embedCloseTicket],
							components: [buttonCloseTicket],
						})

						// Récupération du thread
						const threadTicket = interaction.guild.channels.cache.get(ticket.threadId)

						// Création de l'embed clôture ticket
						const embedClosed = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Ticket clôturé')

						await threadTicket.send({
							embeds: [embedClosed],
						})

						// Clôture du thread
						await threadTicket.setArchived()

						await interaction.reply({
							content: 'Ticket clôturé 👌',
							ephemeral: true,
						})

						// Création de l'embed message ticket en DM
						const embedMessageTicketDM = new EmbedBuilder()
							.setColor('#C27C0E')
							.setAuthor({
								name: interaction.guild.name,
								iconURL: interaction.guild.iconURL({ dynamic: true }),
								url: interaction.guild.vanityURL,
							})
							.setTitle('Ticket clôturé')
							.setDescription(
								`Ton ticket numéro **#${ticketId}** vient d'être clôturé.\nSi tu souhaites en créer un nouveau, tu peux envoyer un message en dessous de celui-ci.`,
							)

						return member.send({
							embeds: [embedMessageTicketDM],
						})
					}
				}

				// Cas bouton classique
				const button = client.buttons.get(interaction.customId)
				if (button) return button.interaction(interaction, client)

				return interaction
			}

			const selectMenu = client.selectmenus.get(interaction.customId)
			if (selectMenu) return selectMenu.interaction(interaction, client)

			return interaction
	}
}
