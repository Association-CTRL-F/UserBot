export default (interaction, client) => {
	if (interaction.type === 'MODAL_SUBMIT') {
		const modal = client.modals.get(interaction.customId)
		if (!modal)
			return interaction.reply({
				content: `Impossible de trouver la modal "${interaction.customId}"`,
				ephemeral: true,
			})

		return modal.interaction(interaction, client)
	}
}
