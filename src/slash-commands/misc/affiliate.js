import { SlashCommandBuilder } from 'discord.js'
import fetch from 'node-fetch'

export default {
	data: new SlashCommandBuilder()
		.setName('affiliate')
		.setDescription('Crée un lien affilié')
		.addStringOption(option =>
			option.setName('url').setDescription('URL longue').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		const long_url = interaction.options.getString('url')

		// Acquisition de la base de données
		const bdd = client.config.db.pools.urlsAPI
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})

		// Requête de récupération de la clé API de l'utilisateur
		let key = ''
		try {
			const sql = 'SELECT * FROM `keys` WHERE discord_id = ?'
			const data = [interaction.user.id]
			const [result] = await bdd.execute(sql, data)
			key = result[0]
		} catch (error) {
			return interaction.editReply({
				content: "Tu n'as pas de clé API 😬",
			})
		}

		// Vérification des permissions
		const permissions = JSON.parse(key.permissions)

		if (!permissions.includes('CREATE_URL'))
			return interaction.editReply({
				content: "Tu n'es pas autorisé à créer des liens 😬",
			})

		try {
			// Requête
			const res = await fetch('https://api.ctrl-f.io/api/urls', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: key.key,
				},
				body: JSON.stringify({
					long_url: long_url,
				}),
			})

			const { status_message, data } = await res.json()

			// S'il y a une erreur en retour ou pas d'url
			if (!res.ok || !data)
				return interaction.editReply({
					content: status_message,
				})

			// Sinon on affiche l'url
			return interaction.editReply({
				content: `<${data.short_url}>`,
			})
		} catch (error) {
			console.log(error)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la création du lien 😕',
			})
		}
	},
}
