import { SlashCommandBuilder, MessageFlags } from 'discord.js'
import { create, all } from 'mathjs'

const math = create(all)

export default {
	data: new SlashCommandBuilder()
		.setName('calc')
		.setDescription('Calculatrice')
		.addStringOption((option) =>
			option.setName('calcul').setDescription('Calcul à effectuer').setRequired(true),
		),

	interaction: async (interaction) => {
		const calcul = interaction.options.getString('calcul')?.trim()

		if (!calcul) {
			return interaction.reply({
				content: 'Tu dois fournir un calcul 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		try {
			const result = math.evaluate(calcul)

			return interaction.editReply({
				content: `Calcul : \`${calcul}\`\nRésultat : \`${String(result)}\``,
			})
		} catch (error) {
			console.error(error)

			return interaction.editReply({
				content:
					"Ce calcul n'est pas valide, vérifie la syntaxe ou les opérateurs utilisés 😕",
			})
		}
	},
}
