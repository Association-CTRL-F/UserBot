import { SlashCommandBuilder } from 'discord.js'
import { create, all } from 'mathjs'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('calc')
		.setDescription('Calculatrice')
		.addStringOption(option =>
			option.setName('calcul').setDescription('Calcul à effectuer').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		const calcul = interaction.options.getString('calcul')
		const math = create(all)

		try {
			return interaction.reply({
				content: `Calcul : \`${calcul}\`\nRésultat : \`${math.evaluate(calcul)}\``,
			})
		} catch (error) {
			return interaction.reply({
				content:
					"Ce calcul n'est pas valide, vérifiez la syntaxe ou les opérateurs utilisés 😕",
				ephemeral: true,
			})
		}
	},
}
