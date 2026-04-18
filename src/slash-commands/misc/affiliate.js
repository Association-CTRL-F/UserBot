import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	ActionRowBuilder,
	TextInputStyle,
	MessageFlags
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('affiliate')
		.setDescription('Crée un lien affilié')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('simple')
				.setDescription('Crée un lien affilié')
				.addStringOption((option) =>
					option.setName('url').setDescription('URL longue').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName('multi').setDescription('Crée des liens affiliés'),
		),

	interaction: async (interaction, client) => {
		switch (interaction.options.getSubcommand()) {
			// Affiliation simple
			case 'simple': {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral })

				const longUrl = interaction.options.getString('url')?.trim()
				if (!longUrl) {
					return interaction.editReply({
						content: 'URL invalide 😕',
					})
				}

				// Acquisition de la base de données
				const bdd = client.config.db.pools.urlsAPI
				if (!bdd) {
					return interaction.editReply({
						content:
							'Une erreur est survenue lors de la connexion à la base de données 😕',
					})
				}

				// Requête de récupération de la clé API de l'utilisateur
				let key = null
				try {
					const sql = 'SELECT * FROM `keys` WHERE discord_id = ?'
					const data = [interaction.user.id]
					const [result] = await bdd.execute(sql, data)
					key = result[0] ?? null
				} catch (error) {
					console.error(error)
					return interaction.editReply({
						content: 'Une erreur est survenue 😬',
					})
				}

				// Vérification de l'accès
				if (!key) {
					return interaction.editReply({
						content: "Tu n'es pas autorisé à utiliser ce service 😬",
					})
				}

				// Vérification des permissions
				let permissions = []
				try {
					permissions = JSON.parse(key.permissions ?? '[]')
				} catch (error) {
					console.error(error)
					return interaction.editReply({
						content: 'Les permissions du compte sont invalides 😕',
					})
				}

				if (!permissions.includes('CREATE_URL')) {
					return interaction.editReply({
						content: "Tu n'es pas autorisé à créer des liens 😬",
					})
				}

				try {
					const res = await fetch('https://api.ctrl-f.info/api/urls', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: key.key,
						},
						body: JSON.stringify({
							long_url: longUrl,
						}),
					})

					let payload = null
					try {
						payload = await res.json()
					} catch {
						return interaction.editReply({
							content: "Réponse invalide de l'API 😕",
						})
					}

					const { status_message: statusMessage, data } = payload ?? {}

					// S'il y a une erreur en retour ou pas d'url
					if (!res.ok || !data?.short_url) {
						return interaction.editReply({
							content:
								statusMessage ||
								'Une erreur est survenue lors de la création du lien 😕',
						})
					}

					// Sinon on affiche l'url
					return interaction.editReply({
						content: `<${data.short_url}>`,
					})
				} catch (error) {
					console.error(error)
					return interaction.editReply({
						content: 'Une erreur est survenue lors de la création du lien 😕',
					})
				}
			}

			// Affiliation multiple
			case 'multi': {
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
								.setRequired(true),
						),
					)

				return interaction.showModal(modalCreate)
			}
		}
	},
}
