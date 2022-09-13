/* eslint-disable default-case */
/* eslint-disable no-case-declarations */
import { InteractionType } from 'discord.js'

export default (interaction, client) => {
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
			const selectMenu = client.selectmenus.get(interaction.customId)
			if (selectMenu) return selectMenu.interaction(interaction, client)

			return interaction
	}
}
