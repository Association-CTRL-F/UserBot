/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder } from 'discord.js'
import { Pagination } from 'pagination.djs'
import { isGuildSetup } from '../../util/util.js'

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
		),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

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
			const sqlCheckName = 'SELECT * FROM automod_domains WHERE domain = ? AND guildId = ?'
			const dataCheckName = [domainString, interaction.guild.id]
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
			// Domaines blacklistés
			case 'domains':
				switch (interaction.options.getSubcommand()) {
					// Liste des domaines blacklistés
					case 'view':
						let domainsView = []
						try {
							const sqlCheckName = 'SELECT * FROM automod_domains WHERE guildId = ?'
							const dataCheckName = [interaction.guild.id]
							const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)
							domainsView = resultCheckName
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
							buttonStyle: 'Secondary',
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
							const sqlInsert =
								'INSERT INTO automod_domains (guildId, domain) VALUES (?, ?)'
							const dataInsert = [interaction.guild.id, domainString]

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
							const sqlDelete =
								'DELETE FROM automod_domains WHERE domain = ? AND guildId = ?'
							const dataDelete = [domainString, interaction.guild.id]

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
