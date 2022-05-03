export default (interaction, client) => {
	if (interaction.type === 'MODAL_SUBMIT') {
		const modal = client.modals.get(interaction.customId)
		if (!modal)
			return modal.reply({
				content: `Impossible de trouver la modal "${modal.customId}"`,
			})

		return modal.interaction(interaction, client)
	}
}
