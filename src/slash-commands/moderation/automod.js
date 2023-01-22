/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import {
	SlashCommandBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	ButtonStyle,
	TextInputStyle,
} from 'discord.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('automod')
		.setDescription("Gère l'Automod")
		.addSubcommandGroup(subcommandGroup =>
			subcommandGroup
				.setName('domains')
				.setDescription('Gères les domaines blacklistés')
				.addSubcommand(subcommand =>
					subcommand.setName('view').setDescription("Voir les règles d'Automod"),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('add')
						.setDescription('Ajouter un domaine à la blacklist')
						.addStringOption(option =>
							option.setName('domaine').setDescription('Domaine').setRequired(true),
						),
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('del')
						.setDescription('Supprimer un domaine de la blacklist')
						.addStringOption(option =>
							option.setName('domaine').setDescription('Domaine').setRequired(true),
						),
				),
		)
		.addSubcommandGroup(subcommandGroup =>
			subcommandGroup
				.setName('regex')
				.setDescription('Gères la regex')
				.addSubcommand(subcommand =>
					subcommand.setName('edit').setDescription('Modifier la regex'),
				),
		),
	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition du domaine à ajouter
		const domainString = interaction.options.getString('domaine')

		// Vérification si le domaine existe
		let domainBdd = {}
		try {
			const sql = 'SELECT * FROM automod_domains WHERE domain = ?'
			const data = [domainString]
			const [result] = await bdd.execute(sql, data)
			domainBdd = result[0]
		} catch (error) {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la récupération de la commande en base de données 😕',
				ephemeral: true,
			})
		}

		switch (interaction.options.getSubcommandGroup()) {
			// Domaines blacklistés
			case 'domains':
				switch (interaction.options.getSubcommand()) {
					// Liste des domaines blacklistés
					case 'view':
						let domainsView = []
						try {
							const sql = 'SELECT * FROM automod_domains'
							const [result] = await bdd.execute(sql)
							domainsView = result
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la récupération des domaines 😕',
								ephemeral: true,
							})
						}

						if (domainsView.length === 0)
							return interaction.reply({
								content: "Aucun domaine n'a été ajouté 😕",
								ephemeral: true,
							})

						// Boucle d'ajout des champs
						const fieldsEmbedView = []

						domainsView.forEach(domain => {
							fieldsEmbedView.push({
								name: `Domaine #${domain.id}`,
								value: domain.domain,
							})
						})

						// Configuration de l'embed
						const paginationView = new Pagination(interaction, {
							firstEmoji: '⏮',
							prevEmoji: '◀️',
							nextEmoji: '▶️',
							lastEmoji: '⏭',
							limit: 5,
							idle: 120000,
							ephemeral: false,
							prevDescription: '',
							postDescription: '',
							buttonStyle: ButtonStyle.Secondary,
							loop: false,
						})

						paginationView.setTitle('Domaines blacklistés')
						paginationView.setDescription(`**Total : ${domainsView.length}**`)
						paginationView.setColor('#C27C0E')
						paginationView.setFields(fieldsEmbedView)
						paginationView.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
						paginationView.paginateFields(true)

						// Envoi de l'embed
						return paginationView.render()

					// Ajouter un domaine blacklisté
					case 'add':
						// Vérification que le domaine existe bien
						if (domainBdd)
							return interaction.reply({
								content: `Le domaine **${domainString}** est déjà ajouté 😕`,
								ephemeral: true,
							})

						// Ajout du domaine en base de données
						try {
							const sql = 'INSERT INTO automod_domains (domain) VALUES (?)'
							const data = [domainString]

							await bdd.execute(sql, data)
						} catch (error) {
							return interaction.reply({
								content:
									"Une erreur est survenue lors de la création de l'ajout du domaine en base de données 😕",
								ephemeral: true,
							})
						}

						if (!client.cache.blacklistedDomains.has(domainString))
							client.cache.blacklistedDomains.add(domainString)

						return interaction.reply({
							content: `Le domaine **${domainString}** a bien été ajouté 👌`,
						})

					// Supprimer un domaine blacklisté
					case 'del':
						// Vérification que le domaine existe bien
						if (!domainBdd)
							return interaction.reply({
								content: `Le domaine **${domainString}** n'est pas ajouté 😕`,
								ephemeral: true,
							})

						// Si oui, alors suppression du domaine
						// en base de données
						try {
							const sql = 'DELETE FROM automod_domains WHERE domain = ?'
							const data = [domainString]

							await bdd.execute(sql, data)
						} catch {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la suppression du domaine en base de données 😬',
								ephemeral: true,
							})
						}

						if (client.cache.blacklistedDomains.has(domainString))
							client.cache.blacklistedDomains.delete(domainString)

						return interaction.reply({
							content: `Le domaine **${domainString}** a bien été supprimé 👌`,
						})
				}

				break

			// Regex
			case 'regex':
				switch (interaction.options.getSubcommand()) {
					// Modifier la regex
					case 'edit':
						let regex = ''
						try {
							const sql = 'SELECT regex FROM automod_regex WHERE id = ?'
							const data = [1]
							const [result] = await bdd.execute(sql, data)
							regex = result[0]
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la récupération de la regex 😕',
								ephemeral: true,
							})
						}

						const modalEdit = new ModalBuilder()
							.setCustomId('automod-regex-edit')
							.setTitle('Modification da la regex')
							.addComponents(
								new ActionRowBuilder().addComponents(
									new TextInputBuilder()
										.setCustomId('content-regex-edit')
										.setLabel('Nouveau contenu de la regex')
										.setStyle(TextInputStyle.Paragraph)
										.setValue(regex.regex)
										.setMinLength(1)
										.setRequired(true),
								),
							)

						return interaction.showModal(modalEdit)
				}
		}
	},
}
