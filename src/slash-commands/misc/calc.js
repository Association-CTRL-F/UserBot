import { SlashCommandBuilder } from '@discordjs/builders'
import { create, all } from 'mathjs'

export default {
	data: new SlashCommandBuilder()
		.setName('calc')
		.setDescription('Calculatrice')
		.addStringOption(option =>
			option.setName('calcul').setDescription('Calcul à effectuer').setRequired(true),
		),
	interaction: async interaction => {
		const calcul = interaction.options.getString('calcul')
		const math = create(all)

		try {
			await interaction.deferReply()
			return interaction.editReply({
				content: `Calcul : ${calcul}\nRésultat : ${math.evaluate(calcul)}`,
			})
		} catch (error) {
			return interaction.editReply({
				content:
					"Ce calcul n'est pas valide, vérifiez la syntaxe où les opérateurs utilisés 😕",
				ephemeral: true,
			})
		}
	},
}
