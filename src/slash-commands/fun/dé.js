import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'

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
			const embed = new MessageEmbed()
				.setColor('#1ABC9C')
				.setTitle('Lancer de dé')
				.setDescription('**SURPRISE**')
				.setThumbnail({
					url: `attachment://rgb.png`,
				})

			return interaction.reply({
				embeds: [embed],
				files: [`./config/commands/dé/rgb.png`],
			})
		}

		// Création de l'embed
		const embed = new MessageEmbed()
			.setColor('#C27C0E')
			.setTitle('Lancer de dé')
			.setDescription(`Tu es tombé sur **${face}**`)
			.setThumbnail({
				url: `attachment://${face}.png`,
			})

		return interaction.reply({
			embeds: [embed],
			files: [`./config/commands/dé/${face}.png`],
		})
	},
}
