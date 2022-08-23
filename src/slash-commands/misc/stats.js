/* eslint-disable no-case-declarations */
/* eslint-disable default-case */

import { SlashCommandBuilder } from 'discord.js'
import { Pagination } from 'pagination.djs'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Affiche les stats')
		.addSubcommand(subcommand =>
			subcommand.setName('commands').setDescription('Affiche les stats des commandes'),
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
			case 'commands':
				let commands = []
				try {
					const sqlSelect =
						'SELECT * FROM commands WHERE guildId = ? ORDER BY numberOfUses DESC'
					const dataSelect = [interaction.guild.id]
					const [resultCommands] = await bdd.execute(sqlSelect, dataSelect)
					commands = resultCommands
				} catch (error) {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la récupération des commandes 😕',
						ephemeral: true,
					})
				}

				if (commands.length === 0)
					return interaction.reply({
						content: "Aucune commande n'a été créée 😕",
						ephemeral: true,
					})

				// Boucle d'ajout des champs
				const fieldsEmbedView = []
				let count = 1
				commands.forEach(command => {
					fieldsEmbedView.push({
						name: `${count}. ${command.name}`,
						value: `Utilisée ${command.numberOfUses} fois`,
					})

					count += 1
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

				paginationView.setTitle('Classement des commandes')
				paginationView.setColor('#C27C0E')
				paginationView.setFields(fieldsEmbedView)
				paginationView.footer = { text: 'Page : {pageNumber} / {totalPages}' }
				paginationView.paginateFields(true)

				// Envoi de l'embed
				return paginationView.render()
		}
	},
}
