import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('dé').setDescription('Lancer de dé'),
	interaction: async (interaction) => {
		await interaction.deferReply()

		// Lancement du dé
		const face = Math.floor(Math.random() * 6) + 1

		// Surprise (~1% de chance)
		const isSurprise = Math.floor(Math.random() * 100) === 0

		if (isSurprise) {
			const embed = new EmbedBuilder()
				.setColor('#1ABC9C')
				.setTitle('Lancer de dé')
				.setDescription('**SURPRISE**')
				.setThumbnail('attachment://rgb.png')

			return interaction.editReply({
				embeds: [embed],
				files: [new AttachmentBuilder('./config/commands/dé/rgb.png')],
			})
		}

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Lancer de dé')
			.setDescription(`Tu es tombé sur **${face}**`)
			.setThumbnail(`attachment://${face}.png`)

		return interaction.editReply({
			embeds: [embed],
			files: [new AttachmentBuilder(`./config/commands/dé/${face}.png`)],
		})
	},
}
