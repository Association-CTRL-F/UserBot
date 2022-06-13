/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'
import { convertDateForDiscord } from '../../util/util.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('commands')
		.setDescription('Commandes personnalisées')
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
						.setDescription('Mot clé de la recherche')
						.setRequired(true),
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

		// Acquisition des paramètres de la guild
		let configGuild = {}
		try {
			const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
			const dataSelect = [interaction.guild.id]
			const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
			configGuild = resultSelect[0]
		} catch (error) {
			return console.log(error)
		}

		switch (interaction.options.getSubcommand()) {
			// Visualisation des commandes
			case 'view':
				// Acquisition du nom
				const nom = interaction.options.getString('nom')

				// Vérification si la commande existe
				let commandBdd = {}
				try {
					const sqlCheckName = 'SELECT * FROM commands WHERE name = ? AND guildId = ?'
					const dataCheckName = [nom, interaction.guild.id]
					const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
					commandBdd = resultCheckName[0]
				} catch (error) {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération de la commande en base de données 😕',
						ephemeral: true,
					})
				}

				if (nom) {
					// Vérification que la commande existe bien
					if (!commandBdd)
						return interaction.reply({
							content: `La commande **${nom}** n'existe pas 😕`,
							ephemeral: true,
						})

					const commandAuthor = interaction.guild.members.cache.get(commandBdd.author)
					const commandEditor = interaction.guild.members.cache.get(
						commandBdd.lastModificationBy,
					)

					let creationText = ''
					let modificationText = ''

					if (commandAuthor)
						creationText = `Créée par ${
							commandAuthor.user.tag
						} (${convertDateForDiscord(commandBdd.createdAt * 1000)})\n`
					else
						creationText = `Créée le ${convertDateForDiscord(
							commandBdd.createdAt * 1000,
						)}\n`

					if (commandBdd.lastModificationAt !== null && commandEditor)
						modificationText = `Dernière modification par ${
							commandEditor.user.tag
						} (${convertDateForDiscord(commandBdd.lastModificationAt * 1000)})\n`
					else if (commandBdd.lastModificationAt !== null)
						modificationText = `Dernière modification le ${convertDateForDiscord(
							commandBdd.lastModificationAt * 1000,
						)}\n`

					const embed = new MessageEmbed()
						.setColor('C27C0E')
						.setTitle(`Commande personnalisée "${commandBdd.name}"`)
						.addFields([
							{
								name: 'Contenu',
								value: `\`\`\`${commandBdd.content}\`\`\``,
							},
						])

					embed.fields.push({
						name: 'Historique',
						value: `${creationText}${modificationText}Utilisée ${commandBdd.numberOfUses} fois`,
					})

					return interaction.reply({ embeds: [embed] })
				}

				// Récupération des commandes
				let commands = []
				try {
					const sqlSelect = 'SELECT * FROM commands WHERE guildId = ?'
					const dataSelect = [interaction.guild.id]

					const [resultCommands] = await bdd.execute(sqlSelect, dataSelect)
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
					const commandContent = String.raw`${command.content}`
					let commandContentCut = ''

					if (commandContent.length < 100)
						commandContentCut = `${command.content.substr(0, 100)}`
					else commandContentCut = `${command.content.substr(0, 100)} [...]`

					fieldsEmbedView.push({
						name: command.name,
						value: `${commandContentCut}`,
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
					buttonStyle: 'SECONDARY',
					loop: false,
				})

				paginationView.setTitle('Commandes personnalisées')
				paginationView.setDescription(
					`**Total : ${commands.length}\nPréfixe : \`${configGuild.COMMANDS_PREFIX}\`**`,
				)
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				paginationView.paginateFields(true)

				// Envoi de l'embed
				return paginationView.render()

			// Chercher une commande
			case 'search':
				// Acquisition du mot clé de la recherche
				const keyword = interaction.options.getString('keyword')
				let commandsSearch = []
				try {
					const sqlSearch =
						'SELECT * FROM commands WHERE MATCH(name) AGAINST(? IN BOOLEAN MODE) OR MATCH(content) AGAINST(? IN BOOLEAN MODE) AND guildId = ?;'
					const dataSearch = [keyword, keyword, interaction.guild.id]
					const [resultsSearch] = await bdd.execute(sqlSearch, dataSearch)
					commandsSearch = resultsSearch
				} catch (error) {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la recherche des commandes 😕',
						ephemeral: true,
					})
				}

				// Boucle d'ajout des champs
				const fieldsEmbedSearch = []

				commandsSearch.forEach(command => {
					const commandContent = String.raw`${command.content}`
					let commandContentCut = ''

					if (commandContent.length < 100)
						commandContentCut = `${command.content.substr(0, 100)}`
					else commandContentCut = `${command.content.substr(0, 100)} [...]`

					fieldsEmbedSearch.push({
						name: command.name,
						value: `${commandContentCut}`,
					})
				})

				// Configuration de l'embed
				const paginationSearch = new Pagination(interaction, {
					firstEmoji: '⏮',
					prevEmoji: '◀️',
					nextEmoji: '▶️',
					lastEmoji: '⏭',
					limit: 5,
					idle: 120000,
					ephemeral: false,
					prevDescription: '',
					postDescription: '',
					buttonStyle: 'SECONDARY',
					loop: false,
				})

				paginationSearch.setTitle('Résultats de la recherche')
				paginationSearch.setDescription(
					`**Total : ${commandsSearch.length}\nPréfixe : \`${configGuild.COMMANDS_PREFIX}\`**`,
				)
				paginationSearch.setColor('#C27C0E')
				paginationSearch.setFields(fieldsEmbedSearch)
				paginationSearch.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				paginationSearch.paginateFields(true)

				// Envoi de l'embed
				return paginationSearch.render()
		}
	},
}
