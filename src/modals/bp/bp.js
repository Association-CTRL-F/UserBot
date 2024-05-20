import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'

export default {
	data: {
		name: 'bp',
	},
	interaction: async (modal, client) => {
		// Acquisition du titre, de la description et du lien
		const titre = modal.fields.getTextInputValue('bp-titre').trim()
		const description = modal.fields.getTextInputValue('bp-description').trim()
		const lien = modal.fields.getTextInputValue('bp-lien').trim().toLowerCase()

		// Acquisition du salon
		const bpChannel = modal.guild.channels.cache.get(client.config.guild.channels.BP_CHANNEL_ID)

		// On prépare un embed avec un bouton de redirection
		const embed = new EmbedBuilder()
			.setColor('#1ABC9C')
			.setTitle(titre)
			.setDescription(description)

		const button = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel('Accéder à ce bon-plan !')
				.setURL(lien)
				.setStyle(ButtonStyle.Link),
		)

		await bpChannel.send({ embeds: [embed], components: [button] })

		return modal.reply({
			content: 'Le bon-plan a bien été envoyé ! 👌',
		})
	},
}
