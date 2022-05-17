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

	if (interaction.isSelectMenu()) {
		const menu = client.menus.get(interaction.customId)
		if (!menu)
			return interaction.reply({
				content: `Impossible de trouver le menu "${interaction.customId}"`,
				ephemeral: true,
			})

		return menu.interaction(interaction, client)
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
