/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	ActionRowBuilder,
	TextInputStyle,
} from 'discord.js'
import fetch from 'node-fetch'

export default {
	data: new SlashCommandBuilder()
		.setName('affiliate')
		.setDescription('Crée un lien affilié')
		.addSubcommand(subcommand =>
			subcommand
				.setName('simple')
				.setDescription('Crée un lien affilié')
				.addStringOption(option =>
					option.setName('url').setDescription('URL longue').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand.setName('multi').setDescription('Crée des liens affiliés'),
		),
	interaction: async (interaction, client) => {
		switch (interaction.options.getSubcommand()) {
			// Affiliation simple
			case 'simple':
				// On diffère la réponse pour avoir plus de 3 secondes
				await interaction.deferReply({ ephemeral: true })

				const long_url = interaction.options.getString('url')

				// Acquisition de la base de données
				const bdd = client.config.db.pools.urlsAPI
				if (!bdd)
					return interaction.editReply({
						content:
							'Une erreur est survenue lors de la connexion à la base de données 😕',
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
						content: 'Une erreur est survenue 😬',
					})
				}

				// Vérification de l'accès
				if (!key)
					return interaction.editReply({
						content: "Tu n'es pas autorisé à utiliser ce service 😬",
					})

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

			// Affiliation multiple
			case 'multi':
				const modalCreate = new ModalBuilder()
					.setCustomId('affiliate-multi')
					.setTitle('Création de liens affiliés')
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('liens-affiliate-multi')
								.setLabel('Collez ici les différents liens à affilier')
								.setStyle(TextInputStyle.Paragraph)
								.setMinLength(1)
								.setRequired(false),
						),
					)

				return interaction.showModal(modalCreate)
		}
	},
}
