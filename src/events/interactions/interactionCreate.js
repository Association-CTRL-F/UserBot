import { ApplicationCommandType, ComponentType, InteractionType, MessageFlags } from 'discord.js'

const replyNotFound = async (interaction, content) => {
	if (!interaction.isRepliable()) return

	const payload = {
		content,
		flags: MessageFlags.Ephemeral,
	}

	if (interaction.deferred || interaction.replied) {
		return interaction.followUp(payload).catch(() => null)
	}

	return interaction.reply(payload).catch(() => null)
}

export default async (interaction, client) => {
	try {
		switch (interaction.type) {
			case InteractionType.ApplicationCommand: {
				if (interaction.commandType === ApplicationCommandType.ChatInput) {
					const command = client.commands.get(interaction.commandName)

					if (!command || typeof command.interaction !== 'function') {
						return replyNotFound(
							interaction,
							`Impossible de trouver la commande "${interaction.commandName}"`,
						)
					}

					return await command.interaction(interaction, client)
				}

				const contextMenu = client.contextmenus.get(interaction.commandName)

				if (!contextMenu || typeof contextMenu.interaction !== 'function') {
					return replyNotFound(
						interaction,
						`Impossible de trouver le context-menu "${interaction.commandName}"`,
					)
				}

				return await contextMenu.interaction(interaction, client)
			}

			case InteractionType.ModalSubmit: {
				const modal = client.modals.get(interaction.customId)

				if (!modal || typeof modal.interaction !== 'function') {
					return replyNotFound(
						interaction,
						`Impossible de trouver la modal "${interaction.customId}"`,
					)
				}

				return await modal.interaction(interaction, client)
			}

			case InteractionType.MessageComponent: {
				if (interaction.componentType === ComponentType.Button) {
					const button =
						client.buttons.get(interaction.customId) ||
						client.buttons.get(interaction.customId.split(':')[0])

					if (!button || typeof button.interaction !== 'function') {
						return replyNotFound(
							interaction,
							`Impossible de trouver le bouton "${interaction.customId}"`,
						)
					}

					return await button.interaction(interaction, client)
				}

				const selectMenu =
					client.selectmenus.get(interaction.customId) ||
					client.selectmenus.get(interaction.customId.split(':')[0])

				if (!selectMenu || typeof selectMenu.interaction !== 'function') {
					return replyNotFound(
						interaction,
						`Impossible de trouver le menu "${interaction.customId}"`,
					)
				}

				return await selectMenu.interaction(interaction, client)
			}

			default:
				return
		}
	} catch (error) {
		console.error(error)

		return replyNotFound(
			interaction,
			"Une erreur est survenue pendant l'exécution de l'interaction 😬",
		)
	}
}
