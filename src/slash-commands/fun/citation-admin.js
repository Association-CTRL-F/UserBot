/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'
import { Pagination } from 'pagination.djs'

export default {
	data: new SlashCommandBuilder()
		.setName('citation-admin')
		.setDescription('Citations')
		.addSubcommand(subcommand =>
			subcommand.setName('view').setDescription('Voir les citations'),
		)
		.addSubcommand(subcommand =>
			subcommand.setName('add').setDescription('Ajouter une nouvelle citation'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('del')
				.setDescription('Supprimer une citation')
				.addStringOption(option =>
					option.setName('id').setDescription('ID de la citation').setRequired(true),
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

		switch (interaction.options.getSubcommand()) {
			// Visualisation des citations
			case 'view':
				let citations = []
				try {
					const sqlView = 'SELECT * FROM citations WHERE guildId = ?'
					const dataView = [interaction.guild.id]
					const [resultCitations] = await bdd.execute(sqlView, dataView)
					citations = resultCitations
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des citations 😬',
						ephemeral: true,
					})
				}

				if (citations.length === 0)
					return interaction.reply({
						content: "Aucune citation n'a été créée",
						ephemeral: true,
					})

				// Sinon, boucle d'ajout des champs
				const fieldsEmbed = []

				citations.forEach(citation => {
					fieldsEmbed.push({
						name: `Citation #${citation.id}`,
						value: citation.citation,
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
					buttonStyle: 'Secondary',
					loop: false,
				})

				pagination.setDescription(`**Total : ${citations.length}**`)
				pagination.setColor('#C27C0E')
				pagination.setFields(fieldsEmbed)
				pagination.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
				pagination.paginateFields(true)

				// Envoi de l'embed
				return pagination.render()

			// Ajouter une citation
			case 'add':
				const modalCreate = new ModalBuilder()
					.setCustomId('citation-create')
					.setTitle("Ajout d'une nouvelle citation")
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('content-citation-create')
								.setLabel('Contenu de la citation')
								.setStyle('Paragraph')
								.setMinLength(1)
								.setRequired(true),
						),
					)
					.addComponents(
						new ActionRowBuilder().addComponents(
							new TextInputBuilder()
								.setCustomId('author-citation-create')
								.setLabel('Auteur de la citation')
								.setStyle('Short')
								.setMinLength(1)
								.setMaxLength(255)
								.setRequired(true),
						),
					)

				return interaction.showModal(modalCreate)

			// Supprime une citation
			case 'del':
				// Acquisition de l'id de la citation
				// puis suppresion en base de données
				let deletedCitation = {}
				try {
					const id = interaction.options.getString('id')
					const sqlDelete = 'DELETE FROM citations WHERE id = ? AND guildId = ?'
					const dataDelete = [id, interaction.guild.id]
					const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)
					deletedCitation = resultDelete
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la suppression de la citation 😬',
						ephemeral: true,
					})
				}

				if (deletedCitation.affectedRows === 1)
					return interaction.reply({
						content: 'La citation a bien été supprimée 👌',
					})

				// Sinon, message d'erreur
				return interaction.reply({
					content: "La citation n'existe pas 😬",
					ephemeral: true,
				})
		}
	},
}
