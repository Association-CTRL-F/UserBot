/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { convertSecondsToString } from '../../util/util.js'
import { SlashCommandBuilder } from 'discord.js'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export default {
	data: new SlashCommandBuilder()
		.setName('slowmode')
		.setDescription('Gère le mode lent sur le salon')
		.addSubcommand(subcommand =>
			subcommand.setName('clear').setDescription('Supprime le mode lent sur le salon'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('set')
				.setDescription('Défini le mode lent sur le salon')
				.addIntegerOption(option =>
					option
						.setName('délai')
						.setDescription('Délai entre chaque message (en secondes)')
						.setRequired(true),
				)
				.addIntegerOption(option =>
					option.setName('durée').setDescription('Durée du mode lent (en secondes)'),
				),
		),
	interaction: async interaction => {
		switch (interaction.options.getSubcommand()) {
			// Ajout d'un cooldown
			case 'set':
				const delai = interaction.options.getInteger('délai')
				const duree = interaction.options.getInteger('durée')

				// On ajoute le cooldown
				// Erreur si le salon est déjà en mode lent
				if (interaction.channel.rateLimitPerUser > 0)
					return interaction.reply({
						content: 'Ce salon est déjà en mode lent 😕',
						ephemeral: true,
					})

				await interaction.channel.setRateLimitPerUser(delai)

				// S'il n'y pas de temps du mode lent,
				// le mode lent reste jusqu'au prochain clear
				if (!duree)
					return interaction.reply({
						content: `Mode lent activé 👌\nDélai entre chaque message : ${convertSecondsToString(
							delai,
						)}\nDurée : indéfinie`,
					})

				// Sinon on donne le temps du mode lent
				await interaction.reply({
					content: `Mode lent activé 👌\nDélai entre chaque message : ${convertSecondsToString(
						delai,
					)}\nDurée : ${convertSecondsToString(duree)}`,
				})

				// On attend le montant défini
				await wait(duree * 1000)

				// Si le salon est encore en mode lent
				if (interaction.channel.rateLimitPerUser > 0) {
					// On le clear et on envoie un message de confirmation
					await interaction.channel.setRateLimitPerUser(0)
					return interaction.channel.send({
						content: 'Mode lent désactivé 👌',
					})
				}

				return

			// Suppression du cooldown
			case 'clear':
				if (interaction.channel.rateLimitPerUser > 0) {
					await interaction.channel.setRateLimitPerUser(0)
					return interaction.reply({
						content: 'Mode lent désactivé 👌',
					})
				}

				return interaction.reply({
					content: "Ce salon n'est pas en mode lent 😕",
					ephemeral: true,
				})
		}
	},
}
