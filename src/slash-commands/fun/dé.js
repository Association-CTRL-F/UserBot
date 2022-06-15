import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder().setName('dé').setDescription('Lancer de dé'),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

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
				.setThumbnail('attachment://rgb.png')

			return interaction.editReply({
				embeds: [embed],
				files: [`./config/commands/dé/rgb.png`],
			})
		}

		// Création de l'embed
		const embed = new MessageEmbed()
			.setColor('#C27C0E')
			.setTitle('Lancer de dé')
			.setDescription(`Tu es tombé sur **${face}**`)
			.setThumbnail(`attachment://${face}.png`)

		return interaction.editReply({
			embeds: [embed],
			files: [`./config/commands/dé/${face}.png`],
		})
	},
}
