import { SlashCommandBuilder } from '@discordjs/builders'
import fetch from 'node-fetch'

export default {
	data: new SlashCommandBuilder()
		.setName('affiliate')
		.setDescription('Crée un lien affilié')
		.addStringOption(option =>
			option.setName('url').setDescription('URL longue').setRequired(true),
		),
	interaction: async (interaction, client) => {
		const long_url = interaction.options.getString('url')

		// Acquisition de la base de données
		const bdd = client.config.db.pools.urlsAPI
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Requête de récupération de la clé API de l'utilisateur
		let api_key = ''
		try {
			const sql = 'SELECT api_key FROM tokens WHERE discord_id = ?'
			const data = [interaction.user.id]
			const [result] = await bdd.execute(sql, data)
			api_key = result[0].api_key
		} catch {
			return interaction.reply({
				content: "Tu n'es pas autorisé à créer un lien affilié 😬",
				ephemeral: true,
			})
		}

		try {
			// Requête
			const res = await fetch('https://api.ctrl-f.io/api/urls', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${api_key}`,
				},
				body: JSON.stringify({
					long_url: long_url,
				}),
			})

			// eslint-disable-next-line no-undefined
			const { status_message, short_url = undefined } = await res.json()

			// S'il y a une erreur en retour ou pas d'url
			if (!res.ok || !short_url)
				return interaction.reply({
					content: status_message,
					ephemeral: true,
				})

			// Sinon on affiche l'url
			return interaction.reply({
				content: `<${short_url}>`,
				ephemeral: true,
			})
		} catch (error) {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la création du lien 😕',
				ephemeral: true,
			})
		}
	},
}
