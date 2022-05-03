/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder } from '@discordjs/builders'
import { db, convertDateForDiscord } from '../../util/util.js'
import { Pagination } from 'pagination.djs'
import { Modal, TextInputComponent, showModal } from 'discord-modals'

export default {
	data: new SlashCommandBuilder()
		.setName('command')
		.setDescription('Gère les commandes')
		.addSubcommand(subcommand =>
			subcommand.setName('view').setDescription('Voir la liste des commandes'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('search')
				.setDescription('Cherche une commande')
				.addStringOption(option =>
					option
						.setName('keyword')
						.setDescription('Mot clé de la recherche (par nom)')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand.setName('create').setDescription('Crée une nouvelle commande'),
		)
		.addSubcommand(subcommand =>
			subcommand.setName('edit').setDescription('Modifie une commande'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Supprime une commande')
				.addStringOption(option =>
					option.setName('nom').setDescription('Nom de la commande').setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		// Acquisition du nom, du contenu et du mot clé de recherche
		const nom = interaction.options.getString('nom')
		const keyword = interaction.options.getString('keyword')

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la commande existe
		const sqlCheckName = 'SELECT * FROM commands WHERE name = ?'
		const dataCheckName = [nom]
		const [rowsCheckName] = await bdd.execute(sqlCheckName, dataCheckName)

		switch (interaction.options.getSubcommand()) {
			// Visualisation des commandes
			case 'view':
				try {
					const [resultView] = await bdd.execute('SELECT * FROM commands')

					// Si erreur
					if (!resultView)
						return interaction.reply({
							content:
								'Une erreur est survenue lors de la récupération des commandes 😬',
							ephemeral: true,
						})

					// Sinon, boucle d'ajout des champs
					const fieldsEmbedView = []
					resultView.forEach(command => {
						fieldsEmbedView.push({
							name: command.name,
							value: `Créée par ${command.author} (${convertDateForDiscord(
								command.createdAt * 1000,
							)})\nDernière modification par ${
								command.lastModificationBy
							} (${convertDateForDiscord(command.lastModification * 1000)})`,
						})
					})

					// Configuration de l'embed
					const paginationView = new Pagination(interaction, {
						firstEmoji: '⏮',
						prevEmoji: '◀️',
						nextEmoji: '▶️',
						lastEmoji: '⏭',
						limit: 5,
						idle: 30000,
						ephemeral: false,
						prevDescription: '',
						postDescription: '',
						buttonStyle: 'SECONDARY',
						loop: false,
					})

					paginationView.setTitle('Commandes personnalisées')
					paginationView.setDescription(`**Total : ${resultView.length}**`)
					paginationView.setColor('#C27C0E')
					paginationView.setFields(fieldsEmbedView)
					paginationView.footer = { text: 'Page : {pageNumber} / {totalPages}' }
					paginationView.paginateFields(true)

					// Envoi de l'embed
					return paginationView.render()
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des commandes 😬',
						ephemeral: true,
					})
				}

			// Chercher une commande
			case 'search':
				try {
					const sqlSearch =
						'SELECT * FROM commands WHERE MATCH(name) AGAINST(? IN BOOLEAN MODE) OR MATCH(content) AGAINST(? IN BOOLEAN MODE);'
					const dataSearch = [keyword, keyword]
					const [resultSearch] = await bdd.execute(sqlSearch, dataSearch)

					// Si erreur
					if (!resultSearch)
						return interaction.reply({
							content:
								'Une erreur est survenue lors de la recherche de la commande 😬',
							ephemeral: true,
						})

					// Sinon, boucle d'ajout des champs
					const fieldsEmbedSearch = []
					resultSearch.forEach(command => {
						fieldsEmbedSearch.push({
							name: command.name,
							value: `Créée par ${command.author} (${convertDateForDiscord(
								command.createdAt * 1000,
							)})\nDernière modification par ${
								command.lastModificationBy
							} (${convertDateForDiscord(command.lastModification * 1000)})`,
						})
					})

					// Configuration de l'embed
					const paginationSearch = new Pagination(interaction, {
						firstEmoji: '⏮',
						prevEmoji: '◀️',
						nextEmoji: '▶️',
						lastEmoji: '⏭',
						limit: 5,
						idle: 30000,
						ephemeral: false,
						prevDescription: '',
						postDescription: '',
						buttonStyle: 'SECONDARY',
						loop: false,
					})

					paginationSearch.setTitle('Résultats de la recherche')
					paginationSearch.setDescription(`**Total : ${resultSearch.length}**`)
					paginationSearch.setColor('#C27C0E')
					paginationSearch.setFields(fieldsEmbedSearch)
					paginationSearch.footer = { text: 'Page : {pageNumber} / {totalPages}' }
					paginationSearch.paginateFields(true)

					// Envoi de l'embed
					return paginationSearch.render()
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la recherche de commande 😬',
						ephemeral: true,
					})
				}

			// Nouvelle commande
			case 'create':
				const modalCreate = new Modal()
					.setCustomId('command-create')
					.setTitle("Création d'une nouvelle commande")
					.addComponents(
						new TextInputComponent()
							.setCustomId('name-command-create')
							.setLabel('Nom de la commande')
							.setStyle('SHORT')
							.setMinLength(1)
							.setMaxLength(255)
							.setRequired(true),
					)
					.addComponents(
						new TextInputComponent()
							.setCustomId('content-command-create')
							.setLabel('Contenu de la commande')
							.setStyle('LONG')
							.setMinLength(1)
							.setRequired(true),
					)

				return showModal(modalCreate, {
					client: client,
					interaction: interaction,
				})

			// Modifie une commande
			case 'edit':
				const modalEdit = new Modal()
					.setCustomId('command-edit')
					.setTitle("Modification d'une commande")
					.addComponents(
						new TextInputComponent()
							.setCustomId('name-command-edit')
							.setLabel('Nom de la commande')
							.setStyle('SHORT')
							.setMinLength(1)
							.setMaxLength(255)
							.setRequired(true),
					)
					.addComponents(
						new TextInputComponent()
							.setCustomId('content-command-edit')
							.setLabel('Nouveau contenu de la commande')
							.setStyle('LONG')
							.setMinLength(1)
							.setRequired(true),
					)

				return showModal(modalEdit, {
					client: client,
					interaction: interaction,
				})

			// Supprime une commande
			case 'delete':
				try {
					// Vérification que la commande existe bien
					if (!rowsCheckName[0])
						return interaction.reply({
							content: `La commande **${nom}** n'existe pas 😕`,
							ephemeral: true,
						})

					// Si oui, alors suppression de la commande
					// en base de données
					const sqlDelete = 'DELETE FROM commands WHERE name = ?'
					const dataDelete = [nom]

					const [rowsDelete] = await bdd.execute(sqlDelete, dataDelete)

					if (rowsDelete.affectedRows)
						return interaction.reply({
							content: `La commande **${nom}** a bien été supprimée 👌`,
						})

					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression de la commande 😬',
						ephemeral: true,
					})
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression de la commande 😬',
						ephemeral: true,
					})
				}
		}
	},
}
