export default (interaction, client) => {
	if (interaction.isCommand()) {
		const command = client.commands.get(interaction.commandName)
		if (!command)
			return interaction.reply({
				content: `Impossible de trouver la commande "${interaction.commandName}"`,
				ephemeral: true,
			})

		return command.interaction(interaction, client)
	}

	if (interaction.isContextMenu()) {
		const contextMenu = client.contextmenus.get(interaction.commandName)
		if (!contextMenu)
			return interaction.reply({
				content: `Impossible de trouver le context-menu "${interaction.commandName}"`,
				ephemeral: true,
			})

		return contextMenu.interaction(interaction, client)
	}

	if (interaction.isSelectMenu()) {
		const selectMenu = client.selectmenus.get(interaction.customId)
		if (!selectMenu)
			return interaction.reply({
				content: `Impossible de trouver le select-menu "${interaction.customId}"`,
				ephemeral: true,
			})

		return selectMenu.interaction(interaction, client)
	}

	if (interaction.isModalSubmit()) {
		const modal = client.modals.get(interaction.customId)
		if (!modal)
			return interaction.reply({
				content: `Impossible de trouver la modal "${interaction.customId}"`,
				ephemeral: true,
			})

		return modal.interaction(interaction, client)
	}
}
