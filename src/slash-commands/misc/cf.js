import { SlashCommandBuilder } from '@discordjs/builders'

export default {
	data: new SlashCommandBuilder().setName('cf').setDescription('Coinflip! (pile ou face)'),
	interaction: async interaction => {
		const random = Math.round(Math.random() * 100)

		let resultat = ''
		if (random < 50) resultat = 'Pile'
		else if (random > 50) resultat = 'Face'
		else resultat = 'Tranche'

		await interaction.reply({ content: 'La pièce tourne.' })
		await interaction.editReply({ content: 'La pièce tourne..' })
		return interaction.editReply({
			content: `La pièce tourne... **${resultat}** !`,
		})
	},
}
