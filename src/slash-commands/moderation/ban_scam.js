import {
	EmbedBuilder,
	ContextMenuCommandBuilder,
	RESTJSONErrorCodes,
	ApplicationCommandType,
	MessageFlags
} from 'discord.js'
import { convertDateForDiscord, diffDate } from '../../util/util.js'

export default {
	contextMenu: new ContextMenuCommandBuilder()
		.setName('ban_scam')
		.setType(ApplicationCommandType.User),

	interaction: async (interaction, client) => {
		// Sécurité supplémentaire
		if (interaction.commandType !== ApplicationCommandType.User) return

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		// Acquisition du membre
		const member = await interaction.guild.members
			.fetch(interaction.targetUser.id)
			.catch(() => null)

		if (!member) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})
		}

		// On ne peut pas se ban soi-même
		if (member.user.id === interaction.user.id) {
			return interaction.editReply({
				content: 'Tu ne peux pas te bannir toi-même 😕',
			})
		}

		// Vérification si le bot peut bannir ce membre
		if (!member.bannable) {
			return interaction.editReply({
				content: "Je n'ai pas les permissions pour bannir ce membre 😬",
			})
		}

		// Vérification si le ban existe déjà
		const existingBan = await interaction.guild.bans.fetch(member.user.id).catch(() => null)

		if (existingBan) {
			return interaction.editReply({
				content: 'Cet utilisateur est déjà banni 😕',
			})
		}

		// Acquisition de la base de données Moderation
		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration) {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
			})
		}

		// Acquisition du salon de logs
		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
		)

		// Envoi du message de bannissement en message privé
		let errorDM = ''

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Scam')
			.setDescription(
				`**Vous êtes à présent banni du serveur**
Votre compte semble avoir été compromis. Pour votre sécurité, nous vous conseillons de changer vos mots de passe.
Si vous estimez que cette sanction est illégitime, vous pouvez effectuer une demande de levée de bannissement que nous étudierons à l'adresse https://moderation.ctrl-f.info`,
			)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
				url: interaction.guild.vanityURL ?? undefined,
			})

		let dmMessage = null
		try {
			dmMessage = await member.send({
				embeds: [embed],
			})
		} catch (error) {
			if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
				errorDM =
					"\n\nℹ️ Le message privé n'a pas été envoyé car l'utilisateur les a bloqués"
			} else {
				console.error(error)
				errorDM =
					"\n\nℹ️ Le message privé n'a pas pu être envoyé à cause d'une erreur inconnue"
			}
		}

		// Ban du membre
		try {
			await interaction.guild.members.ban(member.user.id, {
				deleteMessageSeconds: 86400,
				reason: `${interaction.user.tag} : compte compromis`,
			})
		} catch (error) {
			// Suppression du message privé envoyé car le ban a échoué
			if (dmMessage) {
				await dmMessage.delete().catch(() => null)
			}

			if (error.code === RESTJSONErrorCodes.UnknownUser) {
				return interaction.editReply({
					content: "Tu n'as pas donné un ID d'utilisateur 😬",
				})
			}

			if (error.code === RESTJSONErrorCodes.MissingPermissions) {
				return interaction.editReply({
					content: "Tu n'as pas les permissions pour bannir ce membre 😬",
				})
			}

			console.error(error)
			return interaction.editReply({
				content: 'Une erreur est survenue lors du bannissement du membre 😬',
			})
		}

		await interaction.editReply({
			content: `🔨 \`${member.user.tag}\` a été banni définitivement\n\nRaison : compte compromis${errorDM}`,
		})

		// Création de l'embed de logs
		const logEmbed = new EmbedBuilder()
			.setColor('#C9572A')
			.setAuthor({
				name: `${member.user.tag} (ID : ${member.user.id})`,
				iconURL: member.user.displayAvatarURL({ dynamic: true }),
			})
			.setDescription(`\`\`\`\n${interaction.user.tag} : compte compromis\`\`\``)
			.addFields(
				{
					name: 'Mention',
					value: member.user.toString(),
					inline: true,
				},
				{
					name: 'Date de création du compte',
					value: convertDateForDiscord(member.user.createdAt),
					inline: true,
				},
				{
					name: 'Âge du compte',
					value: diffDate(member.user.createdAt),
					inline: true,
				},
			)
			.setFooter({
				iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				text: `Membre banni par ${interaction.user.tag}`,
			})
			.setTimestamp(new Date())

		// Insertion du nouveau ban en base de données
		try {
			const sql =
				'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
			const data = [
				member.user.id,
				member.user.username,
				member.user.avatar ?? null,
				interaction.user.id,
				interaction.user.username,
				'compte compromis',
				Math.round(Date.now() / 1000),
			]

			await bddModeration.execute(sql, data)
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content: 'Une erreur est survenue lors du ban du membre en base de données 😬',
			})
		}

		if (logsChannel?.isTextBased()) {
			await logsChannel.send({ embeds: [logEmbed] }).catch(console.error)
		}
	},
}
