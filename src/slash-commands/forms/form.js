import {
	SlashCommandBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	MessageFlags,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('form')
		.setDescription('Gère les formulaires')
		.addSubcommand((subcommand) =>
			subcommand.setName('edit').setDescription('Modifie un formulaire'),
		),

	interaction: async (interaction, client) => {
		switch (interaction.options.getSubcommand()) {
			case 'edit': {
				// Acquisition de la base de données
				const bdd = client.config.db.pools.userbot
				if (!bdd) {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la connexion à la base de données 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				// Récupération des formulaires
				let forms = []
				try {
					const sql = 'SELECT * FROM forms ORDER BY name ASC'
					const [result] = await bdd.execute(sql)
					forms = result ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des formulaires 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!forms.length) {
					return interaction.reply({
						content: "Aucun formulaire n'a été créé 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				// Discord limite un select menu à 25 options
				const options = forms.slice(0, 25).map((form) => ({
					label: form.name.slice(0, 100),
					description: `Modification du formulaire "${form.name}"`.slice(0, 100),
					value: form.name,
				}))

				const menu = new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('select-edit-form')
						.setPlaceholder('Sélectionnez le formulaire')
						.addOptions(options),
				)

				const suffix =
					forms.length > 25
						? '\n\n⚠️ Seuls les 25 premiers formulaires sont affichés.'
						: ''

				return interaction.reply({
					content: `Choisissez le formulaire à modifier${suffix}`,
					components: [menu],
					flags: MessageFlags.Ephemeral,
				})
			}

			default:
				return interaction.reply({
					content: 'Sous-commande inconnue 😕',
					flags: MessageFlags.Ephemeral,
				})
		}
	},
}
