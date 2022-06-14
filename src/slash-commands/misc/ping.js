import { SlashCommandBuilder } from '@discordjs/builders'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription("Donne le ping de l'API ainsi que du bot"),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		await interaction.reply({ content: '🏓 Pong ?' })
		const start = new Date()
		await interaction.editReply({ content: '🏓 Pong ?' })
		const editLatency = Math.round(new Date() - start)
		return interaction.editReply({
			content: `Modification d'un message : **${editLatency} ms**\nRéponse API : **${client.ws.ping} ms**`,
		})
	},
}
