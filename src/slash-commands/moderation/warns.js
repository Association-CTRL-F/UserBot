/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder } from '@discordjs/builders'
import { convertDateForDiscord } from '../../util/util.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('warns')
		.setDescription('Gère les avertissements')
		.addSubcommand(subcommand =>
			subcommand
				.setName('view')
				.setDescription("Voir les avertissements d'un membre")
				.addUserOption(option =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Crée un nouvel avertissement')
				.addUserOption(option =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('raison')
						.setDescription("Raison de l'avertissement")
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('del')
				.setDescription('Supprime un avertissement')
				.addStringOption(option =>
					option.setName('id').setDescription("ID de l'avertissement").setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('clear')
				.setDescription("Supprime tous les avertissements d'un membre")
				.addUserOption(option =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		let user = ''
		let member = ''

		// Afin d'éviter les erreurs, on récupère le membre
		// pour toutes les commandes sauf "del"
		if (interaction.options.getSubcommand() !== 'del') {
			// Acquisition du membre
			user = interaction.options.getUser('membre')
			member = interaction.guild.members.cache.get(user.id)
			if (!member)
				return interaction.reply({
					content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
					ephemeral: true,
				})
		}

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		switch (interaction.options.getSubcommand()) {
			// Voir les avertissements
			case 'view':
				let warnings = []
				try {
					const sqlView = 'SELECT * FROM warnings WHERE discordID = ?'
					const dataView = [member.id]
					const [resultWarnings] = await bdd.execute(sqlView, dataView)
					warnings = resultWarnings
				} catch {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des avertissements 😬',
						ephemeral: true,
					})
				}

				// Sinon, boucle d'ajout des champs
				const fieldsEmbed = []
				warnings.forEach(warning => {
					const warnedBy = interaction.guild.members.cache.get(warning.warnedBy)

					let warnText = ''

					if (warnedBy)
						warnText = `Par ${warnedBy.user.tag} - ${convertDateForDiscord(
							warning.warnedAt * 1000,
						)}\nRaison : ${warning.warnReason}`
					else warnText = `Le ${convertDateForDiscord(warning.warnedAt * 1000)}`

					fieldsEmbed.push({
						name: `Avertissement #${warning.id}`,
						value: warnText,
					})
				})

				// Configuration de l'embed
				const pagination = new Pagination(interaction, {
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

				pagination.author = {
					name: `${member.displayName} (ID ${member.id})`,
					icon_url: member.user.displayAvatarURL({ dynamic: true }),
				}

				pagination.setDescription(`**Total : ${warnings.length}**`)
				pagination.setColor('#C27C0E')
				pagination.setFields(fieldsEmbed)
				pagination.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				pagination.paginateFields(true)

				// Envoi de l'embed
				return pagination.render()

			// Crée un nouvel avertissement
			case 'create':
				// Acquisition de la raison
				const reason = interaction.options.getString('raison')

				// Création de l'avertissement en base de données
				try {
					const sqlCreate =
						'INSERT INTO warnings (discordID, warnedBy, warnReason, warnedAt) VALUES (?, ?, ?, ?)'
					const dataCreate = [
						member.id,
						interaction.user.id,
						reason,
						Math.round(Date.now() / 1000),
					]

					await bdd.execute(sqlCreate, dataCreate)
				} catch (error) {
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la création de l'avertissement en base de données 😕",
						ephemeral: true,
					})
				}

				// Lecture du message d'avertissement
				let warnDM = ''
				try {
					const sqlSelectWarn = 'SELECT * FROM forms WHERE name = ?'
					const dataSelectWarn = ['warn']
					const [resultSelectWarn] = await bdd.execute(sqlSelectWarn, dataSelectWarn)
					warnDM = resultSelectWarn[0].content
				} catch (error) {
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la récupération du message d'avertissement en base de données 😕",
						ephemeral: true,
					})
				}

				// Envoi du message d'avertissement en message privé
				let errorDM = ''
				const DMMessage = await member
					.send({
						embeds: [
							{
								color: '#C27C0E',
								title: 'Avertissement',
								description: warnDM,
								author: {
									name: interaction.guild.name,
									icon_url: interaction.guild.iconURL({ dynamic: true }),
									url: interaction.guild.vanityURL,
								},
								fields: [
									{
										name: "Raison de l'avertissement",
										value: reason,
									},
								],
							},
						],
					})
					.catch(error => {
						console.error(error)
						errorDM =
							"\n\nℹ️ Le message privé n'a pas été envoyé car le membre les a bloqué"
					})

				// Si au moins une erreur, throw
				if (DMMessage instanceof Error)
					throw new Error(
						"L'envoi d'un message a échoué. Voir les logs précédents pour plus d'informations.",
					)

				// Message de confirmation
				return interaction.reply({
					content: `⚠️ \`${member.user.tag}\` a reçu un avertissement\n\nRaison : ${reason}${errorDM}`,
				})

			// Supprime un avertissement
			case 'del':
				// Acquisition de l'id de l'avertissement
				// puis suppresion en base de données
				let deletedWarn = {}
				try {
					const id = interaction.options.getString('id')
					const sqlDelete = 'DELETE FROM warnings WHERE id = ?'
					const dataDelete = [id]
					const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)
					deletedWarn = resultDelete
				} catch {
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la suppression de l'avertissement 😬",
						ephemeral: true,
					})
				}

				if (deletedWarn.affectedRows === 1)
					return interaction.reply({
						content: "L'avertissement a bien été supprimé 👌",
					})

				// Sinon, message d'erreur
				return interaction.reply({
					content: "L'avertissement n'existe pas 😬",
					ephemeral: true,
				})

			// Supprime tous les avertissements
			case 'clear':
				// Vérification si le membre a des avertissements
				let deletedWarns = []
				try {
					const sqlDelete = 'SELECT * FROM warnings WHERE discordID = ?'
					const dataDelete = [member.id]
					const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)
					deletedWarns = resultDelete
				} catch {
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la suppression de l'avertissement 😬",
						ephemeral: true,
					})
				}

				if (deletedWarns.length === 0)
					return interaction.reply({
						content: "Ce membre n'a pas d'avertissements 😕",
						ephemeral: true,
					})

				try {
					// Suppression en base de données
					const sqlDeleteAll = 'DELETE FROM warnings WHERE discordID = ?'
					const dataDeleteAll = [member.id]
					await bdd.execute(sqlDeleteAll, dataDeleteAll)
				} catch {
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la suppression des avertissements 😬',
						ephemeral: true,
					})
				}

				// Sinon, message de confirmation
				return interaction.reply({
					content: 'Les avertissements ont bien été supprimés 👌',
				})
		}
	},
}
