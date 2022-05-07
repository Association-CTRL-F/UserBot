/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder } from '@discordjs/builders'
import { db, convertDateForDiscord } from '../../util/util.js'
import { Pagination } from 'pagination.djs'
import { Modal, TextInputComponent, showModal } from 'discord-modals'

export default {
	data: new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Gère les avertissements')
		.addSubcommand(subcommand =>
			subcommand
				.setName('view')
				.setDescription('Voir les avertissements')
				.addUserOption(option =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand.setName('create').setDescription('Crée un nouvel avertissement'),
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
				.setDescription('Supprime tous les avertissements')
				.addUserOption(option =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				),
		),
	interaction: async (interaction, client) => {
		let user = ''
		let member = ''

		// Afin d'éviter les erreurs, on récupère le membre
		// pour toutes les commandes sauf "del"
		if (
			interaction.options.getSubcommand() !== 'del' &&
			interaction.options.getSubcommand() !== 'create'
		) {
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
		const bdd = await db(client, 'userbot')
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
					idle: 30000,
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
				const modalCreate = new Modal()
					.setCustomId('warn-create')
					.setTitle("Création d'un avertissement")
					.addComponents(
						new TextInputComponent()
							.setCustomId('warn-member-id')
							.setLabel('Discord ID')
							.setStyle('SHORT')
							.setMinLength(1)
							.setMaxLength(255)
							.setRequired(true),
					)
					.addComponents(
						new TextInputComponent()
							.setCustomId('warn-reason')
							.setLabel("Raison de l'avertissement")
							.setStyle('LONG')
							.setMinLength(1)
							.setRequired(true),
					)

				return showModal(modalCreate, {
					client: client,
					interaction: interaction,
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
