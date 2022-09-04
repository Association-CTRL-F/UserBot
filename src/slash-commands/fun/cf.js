import { SlashCommandBuilder } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder().setName('cf').setDescription('Coinflip! (pile ou face)'),
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

		const random = Math.round(Math.random() * 100)

		let resultat = ''
		if (random < 50) resultat = 'Pile'
		else if (random > 50) resultat = 'Face'
		else resultat = 'Tranche'

		await interaction.editReply({ content: 'La pièce tourne.' })
		await interaction.editReply({ content: 'La pièce tourne..' })

		if (interaction.user.id === '541245907455311908')
			return interaction.editReply({
				content: `La pièce tourne... **Tranche** !`,
			})
		else if (interaction.user.id === '186871743862800384')
			return interaction.editReply({
				content: `La pièce tourne... **Tranche** !`,
			})
		else if (interaction.user.id === '148410835742621696')
			return interaction.editReply({
				content: `La pièce tourne... **Tranche** !`,
			})

		return interaction.editReply({
			content: `La pièce tourne... **${resultat}** !`,
		})
	},
}
