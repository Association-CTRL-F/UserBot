import { convertSecondsToString } from '../../util/util.js'
import { SlashCommandBuilder, MessageFlags } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('slowmode')
		.setDescription('Gère le mode lent sur le salon')
		.addSubcommand((subcommand) =>
			subcommand.setName('clear').setDescription('Supprime le mode lent sur le salon'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('set')
				.setDescription('Définit le mode lent sur le salon')
				.addIntegerOption((option) =>
					option
						.setName('délai')
						.setDescription('Délai entre chaque message (en secondes)')
						.setMinValue(1)
						.setRequired(true),
				)
				.addIntegerOption((option) =>
					option
						.setName('durée')
						.setDescription('Durée du mode lent (en secondes)')
						.setMinValue(1),
				),
		),

	interaction: async (interaction) => {
		const channel = interaction.channel

		if (!channel || typeof channel.setRateLimitPerUser !== 'function') {
			return interaction.reply({
				content: 'Ce salon ne supporte pas le mode lent 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		switch (interaction.options.getSubcommand()) {
			case 'set': {
				const delai = interaction.options.getInteger('délai')
				const duree = interaction.options.getInteger('durée')

				if (channel.rateLimitPerUser > 0) {
					return interaction.reply({
						content: 'Ce salon est déjà en mode lent 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					await channel.setRateLimitPerUser(delai)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content: "Une erreur est survenue lors de l'activation du mode lent 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!duree) {
					return interaction.reply({
						content: `Mode lent activé 👌\nDélai entre chaque message : ${convertSecondsToString(
							delai,
						)}\nDurée : indéfinie`,
					})
				}

				globalThis.setTimeout(async () => {
					try {
						const freshChannel = await interaction.client.channels
							.fetch(channel.id)
							.catch(() => null)

						if (
							freshChannel &&
							typeof freshChannel.setRateLimitPerUser === 'function' &&
							freshChannel.rateLimitPerUser === delai
						) {
							await freshChannel.setRateLimitPerUser(0)
							await freshChannel.send({
								content: 'Mode lent désactivé 👌',
							})
						}
					} catch (error) {
						console.error(error)
					}
				}, duree * 1000)

				return interaction.reply({
					content: `Mode lent activé 👌\nDélai entre chaque message : ${convertSecondsToString(
						delai,
					)}\nDurée : ${convertSecondsToString(duree)}`,
				})
			}

			case 'clear': {
				if (channel.rateLimitPerUser <= 0) {
					return interaction.reply({
						content: "Ce salon n'est pas en mode lent 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					await channel.setRateLimitPerUser(0)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content: 'Une erreur est survenue lors de la désactivation du mode lent 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: 'Mode lent désactivé 👌',
				})
			}
		}
	},
}
