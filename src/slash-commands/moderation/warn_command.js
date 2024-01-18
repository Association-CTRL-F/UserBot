/* eslint-disable no-unused-vars */
import {
	EmbedBuilder,
	ContextMenuCommandBuilder,
	RESTJSONErrorCodes,
	GuildBan,
	User,
} from 'discord.js'
import { convertDateForDiscord, diffDate } from '../../util/util.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('warn_command').setType(3),
	interaction: async (interaction, client) => {
		if (!interaction.commandType === 2) return

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Acquisition du membre
		const member = interaction.guild.members.cache.get(interaction.targetMessage.author.id)
		if (!member)
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})

		// On ne peut pas se warn soi-même
		if (member.user === interaction.user)
			return interaction.editReply({
				content: 'Tu ne peux pas te donner un avertissement 😕',
			})

		// Acquisition des bases de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
				ephemeral: true,
			})

		// Acquisition du salon de logs
		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
		)
		if (!logsChannel) return

		// Création de l'avertissement en base de données
		try {
			const sqlCreate =
				'INSERT INTO warnings_logs (discord_id, username, avatar, executor_id, executor_username, reason, preuve, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
			const dataCreate = [
				member ? member.user.id : interaction.targetUser,
				member ? member.user.username : interaction.targetUser,
				member ? member.user.avatar : null,
				interaction.user.id,
				interaction.user.username,
				'Salon commande-bot non respecté',
				null,
				Math.round(Date.now() / 1000),
			]

			await bddModeration.execute(sqlCreate, dataCreate)
		} catch (error) {
			return interaction.reply({
				content:
					"Une erreur est survenue lors de la création de l'avertissement en base de données 😕",
				ephemeral: true,
			})
		}

		if (member) {
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
			const embedWarn = new EmbedBuilder()
				.setColor('#C27C0E')
				.setTitle('Avertissement')
				.setDescription(warnDM)
				.setAuthor({
					name: interaction.guild.name,
					iconURL: interaction.guild.iconURL({ dynamic: true }),
					url: interaction.guild.vanityURL,
				})
				.addFields([
					{
						name: 'Raison',
						value: 'Les commandes relatives au bot doivent être utilisées dans le salon dédié sauf si elles sont nécessaires à la discussion en cours.',
					},
				])

			let errorDM = ''
			const DMMessage = await member
				.send({
					embeds: [embedWarn],
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

			interaction.targetMessage.delete()

			// Message de confirmation
			return interaction.editReply({
				content: `⚠️ \`${
					member ? member.user.tag : interaction.targetMessage.author.id
				}\` a reçu un avertissement\n\nRaison : Salon commande-bot non respecté`,
			})
		}
	},
}
