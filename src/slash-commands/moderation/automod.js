/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { MessageActionRow, MessageSelectMenu } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { Modal, TextInputComponent, showModal } from 'discord-modals'
import { db } from '../../util/util.js'

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
					subcommand.setName('add').setDescription("Ajouter une règle d'Automod"),
				)
				.addSubcommand(subcommand =>
					subcommand.setName('edit').setDescription("Modifier une règle d'Automod"),
				),
		),
	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = await db(client, client.config.dbName)
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

				switch (interaction.options.getSubcommand()) {
					// Ajouter une règle d'automod
					case 'add':
						const modalCreate = new Modal()
							.setCustomId('rule-create')
							.setTitle("Création d'une règle")
							.addComponents(
								new TextInputComponent()
									.setCustomId('rule-create-type')
									.setLabel('Type de la règle')
									.setStyle('SHORT')
									.setMinLength(1)
									.setMaxLength(255)
									.setRequired(true),
							)
							.addComponents(
								new TextInputComponent()
									.setCustomId('rule-create-name')
									.setLabel('Nom de la règle')
									.setStyle('SHORT')
									.setMinLength(1)
									.setMaxLength(255)
									.setRequired(true),
							)
							.addComponents(
								new TextInputComponent()
									.setCustomId('rule-create-regex')
									.setLabel('Regex de la règle')
									.setStyle('LONG')
									.setMinLength(1)
									.setRequired(true),
							)
							.addComponents(
								new TextInputComponent()
									.setCustomId('rule-create-reason')
									.setLabel('Raison')
									.setStyle('LONG')
									.setMinLength(1)
									.setRequired(true),
							)

						return showModal(modalCreate, {
							client: client,
							interaction: interaction,
						})

					// Modifier une règle d'automod
					case 'edit':
						const arrayRules = []
						rules.forEach(rule => {
							arrayRules.push({
								label: rule.ruleName,
								description: `Modification de la règle "${rule.ruleName}"`,
								value: rule.ruleName,
							})
						})

						const menu = new MessageActionRow().addComponents(
							new MessageSelectMenu()
								.setCustomId('select-rules')
								.setPlaceholder('Sélectionnez la règle')
								.addOptions(arrayRules),
						)

						return interaction.reply({
							content: 'Choisissez la règle à modifier',
							components: [menu],
							ephemeral: true,
						})
				}
				break

			// Domaines blacklistés
			case 'domains':
				switch (interaction.options.getSubcommand()) {
					// Liste des domaines de la règle 'scam'
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

					// Ajouter un domaine à la règle 'scam'
					case 'add':
						// Vérification que le domaine existe bien
						if (domainBdd)
							return interaction.reply({
								content: `Le domaine **${domainString}** existe déjà 😕`,
								ephemeral: true,
							})

						let domainsAdd = []
						try {
							const sqlSelectAdd = 'SELECT * FROM automodDomains'
							const [resultResultSelectAdd] = await bdd.execute(sqlSelectAdd)
							domainsAdd = resultResultSelectAdd
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la récupération des domaines 😕',
								ephemeral: true,
							})
						}

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

						// Création de la chaine de domaines de la regex
						let domainsAddList = ''
						domainsAdd.forEach(domain => {
							domainsAddList = domainsAddList.concat('|', domain.domain)
						})
						domainsAddList = domainsAddList.concat('|', domainString).replace(/^./, '')

						const regexBaseAdd = String.raw`(http[s]?:\/\/)?(www\.)?((${domainsAddList})[\w]*){1}\.([a-z]{2,})`

						// Mise à jour de la regex en base de données
						try {
							const sqlUpdate = 'UPDATE automodRules SET regex = ? WHERE customId = ?'
							const dataUpdate = [regexBaseAdd, 'scam']

							await bdd.execute(sqlUpdate, dataUpdate)
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la mise à jour de la règle en base de données 😕',
								ephemeral: true,
							})
						}

						return interaction.reply({
							content: "La règle d'Automod a bien été modifiée 👌",
							ephemeral: true,
						})

					// Supprimer un domaine à la règle 'scam'
					case 'del':
						// Vérification que le domaine existe bien
						if (!domainBdd)
							return interaction.reply({
								content: `Le domaine **${domainString}** n'existe pas 😕`,
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

						let domainsDel = []
						try {
							const sqlSelectDel = 'SELECT * FROM automodDomains'
							const [resultSelectDel] = await bdd.execute(sqlSelectDel)
							domainsDel = resultSelectDel
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la récupération des domaines 😕',
								ephemeral: true,
							})
						}

						// Création de la chaine de domaines de la regex
						let domainsDelList = ''
						domainsDel.forEach(domain => {
							domainsDelList = domainsDelList.concat('|', domain.domain)
						})
						domainsDelList = domainsDelList.replace(/^./, '')

						const regexBaseDel = String.raw`(http[s]?:\/\/)?(www\.)?((${domainsDelList})[\w]*){1}\.([a-z]{2,})`

						// Mise à jour de la regex en base de données
						try {
							const sqlUpdate = 'UPDATE automodRules SET regex = ? WHERE customId = ?'
							const dataUpdate = [regexBaseDel.toString(), 'scam']

							await bdd.execute(sqlUpdate, dataUpdate)
						} catch (error) {
							return interaction.reply({
								content:
									'Une erreur est survenue lors de la mise à jour de la règle en base de données 😕',
								ephemeral: true,
							})
						}

						return interaction.reply({
							content: "La règle d'Automod a bien été modifiée 👌",
							ephemeral: true,
						})
				}
		}
	},
}
