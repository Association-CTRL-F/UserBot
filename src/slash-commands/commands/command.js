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
			subcommand
				.setName('view')
				.setDescription('Voir la liste des commandes')
				.addStringOption(option =>
					option.setName('nom').setDescription('Nom de la commande'),
				),
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
			subcommand
				.setName('edit')
				.setDescription('Modifie une commande')
				.addStringOption(option =>
					option
						.setName('nom')
						.setDescription('Nom de la commande à modifier')
						.setRequired(true),
				),
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
		// Acquisition du nom
		const nom = interaction.options.getString('nom')

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Vérification si la commande existe
		let commandBdd = {}
		try {
			const sqlCheckName = 'SELECT * FROM commands WHERE name = ?'
			const dataCheckName = [nom]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			commandBdd = resultCheckName[0]
		} catch (error) {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la récupération de la commande en base de données 😕',
				ephemeral: true,
			})
		}

		switch (interaction.options.getSubcommand()) {
			// Visualisation des commandes
			case 'view':
				if (nom) {
					// Vérification que la commande existe bien
					if (!commandBdd)
						return interaction.reply({
							content: `La commande **${nom}** n'existe pas 😕`,
							ephemeral: true,
						})

					// Récupération de la commande
					let command = {}
					try {
						const sqlView = 'SELECT * FROM commands WHERE name = ?'
						const dataView = [nom]
						const [resultCommand] = await bdd.execute(sqlView, dataView)
						command = resultCommand[0]
					} catch (error) {
						return interaction.reply({
							content:
								'Une erreur est survenue lors de la récupération des commandes 😕',
							ephemeral: true,
						})
					}

					const commandAuthor = interaction.guild.members.cache.get(command.author)
					const commandEditor = interaction.guild.members.cache.get(
						command.lastModificationBy,
					)

					let creationText = ''
					let modificationText = ''

					if (commandAuthor)
						creationText = `Créée par ${
							commandAuthor.user.tag
						} (${convertDateForDiscord(command.createdAt * 1000)})\n`
					else
						creationText = `Créée le ${convertDateForDiscord(
							command.createdAt * 1000,
						)}\n`

					if (command.lastModificationAt !== null && commandEditor)
						modificationText = `Dernière modification par ${
							commandEditor.user.tag
						} (${convertDateForDiscord(command.lastModificationAt * 1000)})\n`
					else if (command.lastModificationAt !== null)
						modificationText = `Dernière modification le ${convertDateForDiscord(
							command.lastModificationAt * 1000,
						)}\n`

					const embed = {
						color: 'C27C0E',
						title: `Commande personnalisée "${command.name}"`,
						fields: [
							{
								name: 'Contenu',
								value: `\`\`\`${command.content}\`\`\``,
							},
						],
					}

					embed.fields.push({
						name: 'Historique',
						value: `${creationText}${modificationText}Utilisée ${command.numberOfUses} fois`,
					})

					return interaction.reply({ embeds: [embed] })
				}

				// Récupération des commandes
				let commands = []
				try {
					const [resultCommands] = await bdd.execute('SELECT * FROM commands')
					commands = resultCommands
				} catch (error) {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des commandes 😕',
						ephemeral: true,
					})
				}

				// Boucle d'ajout des champs
				const fieldsEmbedView = []
				commands.forEach(command => {
					const commandAuthor = interaction.guild.members.cache.get(command.author)
					const commandEditor = interaction.guild.members.cache.get(
						command.lastModificationBy,
					)

					let creationText = ''
					let modificationText = ''

					if (commandAuthor)
						creationText = `Créée par ${
							commandAuthor.user.tag
						} (${convertDateForDiscord(command.createdAt * 1000)})\n`
					else
						creationText = `Créée le ${convertDateForDiscord(
							command.createdAt * 1000,
						)}\n`

					if (command.lastModificationAt !== null && commandEditor)
						modificationText = `Dernière modification par ${
							commandEditor.user.tag
						} (${convertDateForDiscord(command.lastModificationAt * 1000)})\n`
					else if (command.lastModificationAt !== null)
						modificationText = `Dernière modification le ${convertDateForDiscord(
							command.lastModificationAt * 1000,
						)}\n`

					fieldsEmbedView.push({
						name: command.name,
						value: `${creationText}${modificationText}`,
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
				paginationView.setDescription(
					`**Total : ${commands.length}\nPréfixe : \`${client.config.prefix}\`**`,
				)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				paginationView.paginateFields(true)

				// Envoi de l'embed
				return paginationView.render()

			// Chercher une commande
			case 'search':
				// Acquisition du mot clé de recherche
				const keyword = interaction.options.getString('keyword')
				let commandsSearch = []
				try {
					const sqlSearch =
						'SELECT * FROM commands WHERE MATCH(name) AGAINST(? IN BOOLEAN MODE) OR MATCH(content) AGAINST(? IN BOOLEAN MODE);'
					const dataSearch = [keyword, keyword]
					const [resultsSearch] = await bdd.execute(sqlSearch, dataSearch)
					commandsSearch = resultsSearch
				} catch (error) {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la recherche des commandes 😕',
						ephemeral: true,
					})
				}

				// Sinon, boucle d'ajout des champs
				const fieldsEmbedSearch = []
				commandsSearch.forEach(command => {
					const commandAuthor = interaction.guild.members.cache.get(command.author)
					const commandEditor = interaction.guild.members.cache.get(
						command.lastModificationBy,
					)

					let creationText = ''
					let modificationText = ''

					if (commandAuthor)
						creationText = `Créée par ${
							commandAuthor.user.tag
						} (${convertDateForDiscord(command.createdAt * 1000)})\n`
					else
						creationText = `Créée le ${convertDateForDiscord(
							command.createdAt * 1000,
						)}\n`

					if (command.lastModificationAt !== null && commandEditor)
						modificationText = `Dernière modification par ${
							commandEditor.user.tag
						} (${convertDateForDiscord(command.lastModificationAt * 1000)})\n`
					else if (command.lastModificationAt !== null)
						modificationText = `Dernière modification le ${convertDateForDiscord(
							command.lastModificationAt * 1000,
						)}\n`

					fieldsEmbedSearch.push({
						name: command.name,
						value: `${creationText}${modificationText}`,
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
				paginationSearch.setDescription(
					`**Total : ${commandsSearch.length}\nPréfixe : \`${client.config.prefix}\`**`,
				)
				paginationSearch.setColor('#C27C0E')
				paginationSearch.setFields(fieldsEmbedSearch)
				paginationSearch.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				paginationSearch.paginateFields(true)

				// Envoi de l'embed
				return paginationSearch.render()

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
				// Vérification que la commande existe bien
				if (!commandBdd)
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						ephemeral: true,
					})

				const modalEdit = new Modal()
					.setCustomId('command-edit')
					.setTitle("Modification d'une commande")
					.addComponents(
						new TextInputComponent()
							.setCustomId('name-command-edit')
							.setLabel('Nom de la commande')
							.setStyle('SHORT')
							.setDefaultValue(commandBdd.name)
							.setMinLength(1)
							.setMaxLength(255)
							.setRequired(true),
					)
					.addComponents(
						new TextInputComponent()
							.setCustomId('content-command-edit')
							.setLabel('Nouveau contenu de la commande')
							.setStyle('LONG')
							.setDefaultValue(commandBdd.content)
							.setMinLength(1)
							.setRequired(true),
					)

				return showModal(modalEdit, {
					client: client,
					interaction: interaction,
				})

			// Supprime une commande
			case 'delete':
				// Vérification que la commande existe bien
				if (!commandBdd)
					return interaction.reply({
						content: `La commande **${nom}** n'existe pas 😕`,
						ephemeral: true,
					})

				// Si oui, alors suppression de la commande en base de données
				try {
					const sqlDelete = 'DELETE FROM commands WHERE name = ?'
					const dataDelete = [nom]

					await bdd.execute(sqlDelete, dataDelete)
				} catch {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la suppression de la commande en base de données 😬',
						ephemeral: true,
					})
				}

				return interaction.reply({
					content: `La commande **${nom}** a bien été supprimée 👌`,
				})
		}
	},
}
