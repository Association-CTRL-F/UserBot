import { SlashCommandBuilder } from 'discord.js'
import fetch from 'node-fetch'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('affiliate')
		.setDescription('Crée un lien affilié')
		.addStringOption(option =>
			option.setName('url').setDescription('URL longue').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

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
		let api_key = ''
		try {
			const sql = 'SELECT api_key FROM tokens WHERE discord_id = ?'
			const data = [interaction.user.id]
			const [result] = await bdd.execute(sql, data)
			api_key = result[0].api_key
		} catch {
			return interaction.editReply({
				content: "Tu n'es pas autorisé à créer un lien affilié 😬",
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
				return interaction.editReply({
					content: status_message,
				})

			// Sinon on affiche l'url
			return interaction.editReply({
				content: `<${short_url}>`,
			})
		} catch (error) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la création du lien 😕',
			})
		}
	},
}
