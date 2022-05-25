import { SlashCommandBuilder } from '@discordjs/builders'
import { create, all } from 'mathjs'

export default {
	data: new SlashCommandBuilder()
		.setName('calc')
		.setDescription('Calculatrice')
		.addStringOption(option =>
			option.setName('calcul').setDescription('Calcul à effectuer').setRequired(true),
		),
	interaction: interaction => {
		const calcul = interaction.options.getString('calcul')
		const math = create(all)

		try {
			return interaction.reply({
				content: `Calcul : ${calcul}\nRésultat : ${math.evaluate(calcul)}`,
			})
		} catch (error) {
			return interaction.reply({ content: "Ce calcul n'est pas valide", ephemeral: true })
		}
	},
}
