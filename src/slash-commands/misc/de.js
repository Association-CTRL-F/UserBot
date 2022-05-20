import { SlashCommandBuilder } from '@discordjs/builders'

export default {
	data: new SlashCommandBuilder().setName('dé').setDescription('Lancer de dé'),
	interaction: interaction => {
		const random = Math.floor(Math.random() * 6) + 1

		// Création de l'embed
		const embed = {
			color: '#C27C0E',
			title: 'Lancer de dé',
			description: `Tu es tombé sur **${random}**`,
			thumbnail: {
				url: `attachment://${random}.png`,
			},
		}

		return interaction.reply({ embeds: [embed], files: [`./config/commands/dé/${random}.png`] })
	},
}
