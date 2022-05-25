import { SlashCommandBuilder } from '@discordjs/builders'

export default {
	data: new SlashCommandBuilder().setName('dé').setDescription('Lancer de dé'),
	interaction: interaction => {
		// Lancement du dé
		const face = Math.floor(Math.random() * 6) + 1

		// Surprise
		const randomSurprise = Math.round(Math.random() * 100)
		const randomTirage = Math.round(Math.random() * 100)

		if (randomSurprise === randomTirage) {
			// Création de l'embed surprise
			const embed = {
				color: '#1ABC9C',
				title: 'Lancer de dé',
				description: `**SURPRISE**`,
				thumbnail: {
					url: `attachment://rgb.png`,
				},
			}

			return interaction.reply({
				embeds: [embed],
				files: [`./config/commands/dé/rgb.png`],
			})
		}

		// Création de l'embed
		const embed = {
			color: '#C27C0E',
			title: 'Lancer de dé',
			description: `Tu es tombé sur **${face}**`,
			thumbnail: {
				url: `attachment://${face}.png`,
			},
		}

		return interaction.reply({
			embeds: [embed],
			files: [`./config/commands/dé/${face}.png`],
		})
	},
}
