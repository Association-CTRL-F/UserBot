import { EmbedBuilder, ChannelType, MessageFlags } from 'discord.js'

export default {
	data: {
		name: 'bp',
	},
	interaction: async (modal, client) => {
		await modal.deferReply({ flags: MessageFlags.Ephemeral })

		// Acquisition du titre, de la description et du lien
		const titre = modal.fields.getTextInputValue('bp-titre').trim()
		const description = modal.fields.getTextInputValue('bp-description').trim()
		const lien = modal.fields.getTextInputValue('bp-lien').trim()

		// Acquisition du salon
		const bpChannel = modal.guild?.channels.cache.get(
			client.config.guild.channels.BP_CHANNEL_ID,
		)

		if (!bpChannel || !bpChannel.isTextBased()) {
			return modal.editReply({
				content: 'Impossible de trouver le salon des bons plans 😕',
			})
		}

		// Préparation de l'embed
		const embed = new EmbedBuilder()
			.setColor('#1ABC9C')
			.setTitle(titre)
			.setURL(lien)
			.setDescription(description)
			.setFooter({
				iconURL: modal.user.displayAvatarURL({ dynamic: true }),
				text: `Bon-plan proposé par ${modal.user.tag}`,
			})

		try {
			const bpPosted = await bpChannel.send({ embeds: [embed] })

			// Crosspost uniquement si c'est un salon d'annonces
			if (bpChannel.type === ChannelType.GuildAnnouncement) {
				await bpPosted.crosspost().catch(() => null)
			}

			return modal.editReply({
				content: 'Le bon-plan a bien été envoyé ! 👌',
			})
		} catch (error) {
			console.error(error)

			return modal.editReply({
				content: "Une erreur est survenue lors de l'envoi du bon-plan 😕",
			})
		}
	},
}
