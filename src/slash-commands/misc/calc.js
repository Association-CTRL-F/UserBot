import { SlashCommandBuilder } from '@discordjs/builders'
import calc from 'ez-calculator'

export default {
	data: new SlashCommandBuilder()
		.setName('calc')
		.setDescription('Calculatrice')
		.addStringOption(option =>
			option.setName('calcul').setDescription('Calcul à effectuer').setRequired(true),
		)
		.addBooleanOption(option =>
			option.setName('ephemeral').setDescription('Veux-tu une réponse éphémère ?'),
		),
	interaction: async interaction => {
		// Acquisition du calcul à effectuer et de la réponse éphémère
		const calcul = interaction.options.getString('calcul')
		const ephemeral = interaction.options.getBoolean('ephemeral')

		// Calcul du résutat
		const resultat = await calc.calculate(calcul).toString()

		return interaction.reply({
			content: `Résultat : **${resultat}**`,
			ephemeral: ephemeral,
		})
	},
}
