import { SlashCommandBuilder } from '@discordjs/builders'

export default {
	data: new SlashCommandBuilder().setName('cf').setDescription('Coinflip! (pile ou face)'),
	interaction: async interaction => {
		const random = Math.round(Math.random() * 100)
		let color = '#C27C0E'

		let resultat = ''
		if (random < 50) {
			resultat = 'Pile'
		} else if (random > 50) {
			resultat = 'Face'
		} else {
			resultat = 'Tranche'
			color = '#1ABC9C'
		}

		await interaction.reply({
			embeds: [
				{
					color: '#C27C0E',
					title: 'Coinflip!',
					description: 'La pièce tourne.',
				},
			],
		})

		await interaction.editReply({
			embeds: [
				{
					color: '#C27C0E',
					title: 'Coinflip!',
					description: 'La pièce tourne..',
				},
			],
		})

		return interaction.editReply({
			embeds: [
				{
					color: color,
					title: 'Coinflip!',
					description: `Tu es tombé sur **${resultat}**`,
				},
			],
		})
	},
}
