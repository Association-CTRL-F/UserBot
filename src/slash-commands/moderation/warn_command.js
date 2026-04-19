import {
	EmbedBuilder,
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	RESTJSONErrorCodes,
} from 'discord.js'

export default {
	contextMenu: new ContextMenuCommandBuilder()
		.setName('warn_command')
		.setType(ApplicationCommandType.Message),

	interaction: async (interaction, client) => {
		if (interaction.commandType !== ApplicationCommandType.Message) return

		await interaction.deferReply()

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		const targetMessage = interaction.targetMessage
		if (!targetMessage || !targetMessage.guild) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé le message ciblé 😕",
			})
		}

		// On ne peut pas warn un bot
		if (targetMessage.author.bot) {
			return interaction.editReply({
				content: 'Tu ne peux pas avertir un bot 😕',
			})
		}

		// Récupération du membre
		const member = await interaction.guild.members
			.fetch(targetMessage.author.id)
			.catch(() => null)
		if (!member) {
			return interaction.editReply({
				content:
					"Je n'ai pas trouvé cet utilisateur, il n'est sans doute plus présent sur le serveur 😕",
			})
		}

		// On ne peut pas se warn soi-même
		if (member.user.id === interaction.user.id) {
			return interaction.editReply({
				content: 'Tu ne peux pas te donner un avertissement 😕',
			})
		}

		// Bases de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration) {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
			})
		}

		// Lecture du message d'avertissement
		let warnDM = ''
		try {
			const sqlSelectWarn = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectWarn = ['warn']
			const [resultSelectWarn] = await bdd.execute(sqlSelectWarn, dataSelectWarn)

			warnDM = resultSelectWarn?.[0]?.content ?? ''
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la récupération du message d'avertissement en base de données 😕",
			})
		}

		if (!warnDM) {
			return interaction.editReply({
				content: "Le message d'avertissement est introuvable ou vide 😕",
			})
		}

		// Création de l'avertissement en base de données
		try {
			const sqlCreate =
				'INSERT INTO warnings_logs (discord_id, username, avatar, executor_id, executor_username, reason, preuve, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
			const dataCreate = [
				member.user.id,
				member.user.username,
				member.user.avatar ?? null,
				interaction.user.id,
				interaction.user.username,
				'Salon commande-bot non respecté',
				null,
				Math.round(Date.now() / 1000),
			]

			await bddModeration.execute(sqlCreate, dataCreate)
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la création de l'avertissement en base de données 😕",
			})
		}

		// Envoi du message d'avertissement en message privé
		const embedWarn = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Avertissement')
			.setDescription(warnDM)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
				url: interaction.guild.vanityURL ?? undefined,
			})
			.addFields({
				name: 'Raison',
				value: 'Les commandes relatives au bot doivent être utilisées dans le salon dédié sauf si elles sont nécessaires à la discussion en cours.',
			})

		let errorDM = ''
		try {
			await member.send({
				embeds: [embedWarn],
			})
		} catch (error) {
			if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
				errorDM = "\n\nℹ️ Le message privé n'a pas été envoyé car le membre les a bloqués"
			} else {
				console.error(error)
				errorDM = "\n\nℹ️ Une erreur est survenue lors de l'envoi du message privé"
			}
		}

		// Suppression du message ciblé
		await targetMessage.delete().catch((error) => {
			if (error.code !== RESTJSONErrorCodes.UnknownMessage) {
				console.error(error)
			}
		})

		return interaction.editReply({
			content: `⚠️ \`${member.user.tag}\` a reçu un avertissement\n\nRaison : Salon commande-bot non respecté${errorDM}`,
		})
	},
}
