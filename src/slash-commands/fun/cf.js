import { SlashCommandBuilder } from '@discordjs/builders'
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
