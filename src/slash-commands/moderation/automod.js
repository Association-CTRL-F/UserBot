/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { MessageActionRow, MessageSelectMenu } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
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
				.setName('rules')
				.setDescription("Gères les règles d'Automod")
				.addSubcommand(subcommand =>
					subcommand
						.setName('view')
						.setDescription("Voir une règle d'Automod")
						.addStringOption(option =>
							option.setName('id').setDescription('ID de la règle'),
						),
				)
				.addSubcommand(subcommand =>
					subcommand.setName('create').setDescription("Créer une règle d'Automod"),
				)
				.addSubcommand(subcommand =>
					subcommand.setName('edit').setDescription("Modifier une règle d'Automod"),
				)
				.addSubcommand(subcommand =>
					subcommand.setName('del').setDescription("Supprimer une règle d'Automod"),
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
			const sqlCheckName = 'SELECT * FROM automodDomains WHERE domain = ?'
			const dataCheckName = [domainString]
			const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
			domainBdd = resultCheckName[0]
		} catch (error) {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la récupération de la commande en base de données 😕',
				ephemeral: true,
			})
		}

		switch (interaction.options.getSubcommandGroup()) {
			// Règles d'automod
			case 'rules':
				// Récupération des règles
				let rules = []
				try {
					const sqlSelect = 'SELECT * FROM automodRules'
					const [resultSelect] = await bdd.execute(sqlSelect)
					rules = resultSelect
				} catch {
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la récupération des règles d'Automod 😬",
						ephemeral: true,
					})
				}

				const arrayRules = []
				rules.forEach(rule => {
					arrayRules.push({
						label: rule.customId,
						description: `Modification de la règle "${rule.customId}"`,
						value: rule.customId,
					})
				})

				switch (interaction.options.getSubcommand()) {
					// Voir les règles d'automod
					case 'view':
						// Acquisition du nom
						const ruleId = interaction.options.getString('id')

						// Vérification si la règle existe
						let ruleBdd = {}
						try {
							const sqlCheckName = 'SELECT * FROM automodRules WHERE id = ?'
							const dataCheckName = [ruleId]
							const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
							ruleBdd = resultCheckName[0]
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la récupération de la commande en base de données 😕',
								ephemeral: true,
							})
						}

						if (ruleId) {
							// Vérification que la commande existe bien
							if (!ruleBdd)
								return interaction.reply({
									content: `La règle n'existe pas 😕`,
									ephemeral: true,
								})

							let displayRoles = ''
							const ignoredRoles = ruleBdd.ignoredRoles.split(',')
							ignoredRoles.forEach(ignoredRole => {
								displayRoles = displayRoles.concat('\n', `• <@&${ignoredRole}>`)
							})

							const embed = {
								color: 'C27C0E',
								title: `Règle d'automod "${ruleBdd.customId}"`,
								fields: [
									{
										name: 'Type',
										value: ruleBdd.type,
									},
									{
										name: 'Contenu de la regex',
										value: `\`\`\`${ruleBdd.regex}\`\`\``,
									},
									{
										name: 'Rôles ignorés',
										value: displayRoles,
									},
									{
										name: 'Raison',
										value: ruleBdd.reason,
									},
								],
							}

							return interaction.reply({ embeds: [embed] })
						}

						// Sinon, boucle d'ajout des champs
						const fieldsEmbed = []
						rules.forEach(rule => {
							fieldsEmbed.push({
								name: `Règle #${rule.id}`,
								value: rule.customId,
							})
						})

						// Configuration de l'embed
						const pagination = new Pagination(interaction, {
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

						pagination.setTitle("Règles d'automod")
						pagination.setDescription(`**Total : ${rules.length}**`)
						pagination.setColor('#C27C0E')
						pagination.setFields(fieldsEmbed)
						pagination.footer = { text: 'Page : {pageNumber} / {totalPages}' }
						pagination.paginateFields(true)

						// Envoi de l'embed
						return pagination.render()

					// Créer une règle d'automod
					case 'create':
						const menuType = new MessageActionRow().addComponents(
							new MessageSelectMenu()
								.setCustomId('select-rule-create')
								.setPlaceholder('Sélectionnez un type de règle')
								.addOptions([
									{
										label: 'Warn',
										description: 'Avertir le membre',
										value: 'warn',
									},
									{
										label: 'Ban',
										description: 'banir le membre',
										value: 'ban',
									},
								]),
						)

						return interaction.reply({
							content: 'Choisissez le type de règle à créer',
							components: [menuType],
							ephemeral: true,
						})

					// Modifier une règle d'automod
					case 'edit':
						const menuRulesEdit = new MessageActionRow().addComponents(
							new MessageSelectMenu()
								.setCustomId('select-rule-edit')
								.setPlaceholder('Sélectionnez la règle')
								.addOptions(arrayRules),
						)

						return interaction.reply({
							content: 'Choisissez la règle à modifier',
							components: [menuRulesEdit],
							ephemeral: true,
						})

					// Supprimer une règle d'automod
					case 'del':
						const menuRulesDel = new MessageActionRow().addComponents(
							new MessageSelectMenu()
								.setCustomId('select-rule-del')
								.setPlaceholder('Sélectionnez la règle')
								.addOptions(arrayRules),
						)

						return interaction.reply({
							content: 'Choisissez la règle à supprimer',
							components: [menuRulesDel],
							ephemeral: true,
						})
				}
				break

			// Domaines blacklistés
			case 'domains':
				switch (interaction.options.getSubcommand()) {
					// Liste des domaines blacklistés
					case 'view':
						let domainsView = []
						try {
							const sqlCheckName = 'SELECT * FROM automodDomains'
							const [resultCheckName] = await bdd.execute(sqlCheckName)
							domainsView = resultCheckName
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la récupération des domaines 😕',
								ephemeral: true,
							})
						}

						let domainsViewList = ''
						domainsView.forEach(domain => {
							domainsViewList = domainsViewList.concat('\n', `• ${domain.domain}`)
						})

						const embed = {
							color: 'C27C0E',
							title: 'Domaines blacklistés',
							description: domainsViewList,
						}

						return interaction.reply({ embeds: [embed] })

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
							const sqlInsert = 'INSERT INTO automodDomains (domain) VALUES (?)'
							const dataInsert = [domainString]

							await bdd.execute(sqlInsert, dataInsert)
						} catch (error) {
							return interaction.reply({
								content:
									"Une erreur est survenue lors de la création de l'ajout du domaine en base de données 😕",
								ephemeral: true,
							})
						}

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
							const sqlDelete = 'DELETE FROM automodDomains WHERE domain = ?'
							const dataDelete = [domainString]

							await bdd.execute(sqlDelete, dataDelete)
						} catch {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la suppression du domaine en base de données 😬',
								ephemeral: true,
							})
						}

						return interaction.reply({
							content: `Le domaine **${domainString}** a bien été supprimé 👌`,
						})
				}
		}
	},
}
