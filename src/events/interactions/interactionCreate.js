import { InteractionType } from 'discord.js'

export default (interaction, client) => {
	if (interaction.type === InteractionType.ApplicationCommand)
		if (interaction.commandType === 1) {
			const command = client.commands.get(interaction.commandName)
			if (!command)
				return interaction.reply({
					content: `Impossible de trouver la commande "${interaction.commandName}"`,
					ephemeral: true,
				})

			return command.interaction(interaction, client)
		} else {
			const contextMenu = client.contextmenus.get(interaction.commandName)
			if (!contextMenu)
				return interaction.reply({
					content: `Impossible de trouver le context-menu "${interaction.commandName}"`,
					ephemeral: true,
				})

			return contextMenu.interaction(interaction, client)
		}

	if (interaction.type === InteractionType.ModalSubmit) {
		const modal = client.modals.get(interaction.customId)
		if (!modal)
			return interaction.reply({
				content: `Impossible de trouver la modal "${interaction.customId}"`,
				ephemeral: true,
			})

		return modal.interaction(interaction, client)
	}

	if (interaction.type === InteractionType.MessageComponent) {
		const selectMenu = client.selectmenus.get(interaction.customId)
		if (selectMenu) return selectMenu.interaction(interaction, client)

		return interaction
	}
}
