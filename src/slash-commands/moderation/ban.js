import { SlashCommandBuilder, EmbedBuilder, RESTJSONErrorCodes, MessageFlags } from 'discord.js'
import { convertDateForDiscord, diffDate } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Banni un membre')
		.addStringOption((option) =>
			option.setName('membre').setDescription('Discord ID').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('raison').setDescription('Raison du bannissement').setRequired(true),
		)
		.addAttachmentOption((option) =>
			option.setName('preuve').setDescription('Preuve du bannissement'),
		)
		.addStringOption((option) =>
			option
				.setName('messages')
				.setDescription('Nombre de jours de messages à supprimer (0 à 7 inclus)')
				.addChoices(
					{ name: 'Ne pas supprimer', value: '0' },
					{ name: '1 jour', value: '1' },
					{ name: '2 jours', value: '2' },
					{ name: '3 jours', value: '3' },
					{ name: '4 jours', value: '4' },
					{ name: '5 jours', value: '5' },
					{ name: '6 jours', value: '6' },
					{ name: '7 jours', value: '7' },
				),
		),

	interaction: async (interaction, client) => {
		await interaction.deferReply()

		const userId = interaction.options.getString('membre')
		const reason = interaction.options.getString('raison').trim()
		const proofAttachment = interaction.options.getAttachment('preuve')
		const preuve = proofAttachment?.url ?? null
		const banMessagesDays = Number(interaction.options.getString('messages') ?? '0')

		const matchID = userId.match(/^\d{17,19}$/)
		if (!matchID) {
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID valide 😕",
			})
		}

		if (userId === interaction.user.id) {
			return interaction.editReply({
				content: 'Tu ne peux pas te bannir toi-même 😕',
			})
		}

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		// Acquisition du membre si présent sur le serveur
		const member = await interaction.guild.members.fetch(userId).catch(() => null)

		if (member && !member.bannable) {
			return interaction.editReply({
				content: "Je n'ai pas les permissions pour bannir ce membre 😬",
			})
		}

		// Vérification si le ban existe déjà
		const existingBan = await interaction.guild.bans.fetch(userId).catch(() => null)
		if (existingBan) {
			return interaction.editReply({
				content: 'Cet utilisateur est déjà banni 😕',
			})
		}

		// Acquisition de la base de données UserBot
		const bddUserbot = client.config.db.pools.userbot
		if (!bddUserbot) {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données UserBot 😕',
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

		// Acquisition du message de bannissement
		let banDM = ''
		try {
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = ['ban']
			const [result] = await bddUserbot.execute(sql, data)

			banDM = result?.[0]?.content ?? ''
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du message de bannissement en base de données 😬',
			})
		}

		if (!banDM) {
			return interaction.editReply({
				content: 'Le message de bannissement est introuvable ou vide 😕',
			})
		}

		// Envoi du message de bannissement en message privé
		let errorDM = ''
		let dmMessage = null

		const dmEmbed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Bannissement')
			.setDescription(banDM)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
				url: interaction.guild.vanityURL ?? undefined,
			})
			.addFields({
				name: 'Raison',
				value: reason,
			})

		if (member) {
			try {
				dmMessage = await member.send({
					embeds: [dmEmbed],
				})
			} catch (error) {
				console.error(error)
				errorDM =
					"\n\nℹ️ Le message privé n'a pas été envoyé car l'utilisateur les a bloqués ou fermés"
			}
		}

		// Ban du membre
		try {
			await interaction.guild.members.ban(userId, {
				deleteMessageSeconds: banMessagesDays * 86400,
				reason: `${interaction.user.tag} : ${reason}`,
			})
		} catch (error) {
			if (dmMessage) {
				await dmMessage.delete().catch(() => null)
			}

			if (error.code === RESTJSONErrorCodes.UnknownUser) {
				return interaction.editReply({
					content: "Tu n'as pas donné un ID d'utilisateur valide 😬",
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

		// Récupération de l'utilisateur pour les logs si le membre n'était pas en cache / sur le serveur
		const targetUser = member?.user ?? (await client.users.fetch(userId).catch(() => null))

		const targetTag = targetUser?.tag ?? userId
		const targetUsername = targetUser?.username ?? userId
		const targetAvatar = targetUser?.avatar ?? null

		await interaction.editReply({
			content: `🔨 \`${targetTag}\` a été banni définitivement\n\nRaison : ${reason}${errorDM}${
				preuve ? `\n\nPreuve : <${preuve}>` : ''
			}`,
		})

		const escapedContent = reason.replace(/```/g, '\\`\\`\\`')

		const logEmbed = new EmbedBuilder()
			.setColor('#C9572A')
			.setAuthor({
				name: `${targetTag} (ID : ${userId})`,
				iconURL: targetUser?.displayAvatarURL({ dynamic: true }) ?? undefined,
			})
			.setDescription(`\`\`\`\n${interaction.user.tag} : ${escapedContent}\`\`\``)
			.setFooter({
				iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				text: `Membre banni par ${interaction.user.tag}`,
			})
			.setTimestamp(new Date())

		if (targetUser) {
			logEmbed.addFields(
				{
					name: 'Mention',
					value: targetUser.toString(),
					inline: true,
				},
				{
					name: 'Date de création du compte',
					value: convertDateForDiscord(targetUser.createdAt),
					inline: true,
				},
				{
					name: 'Âge du compte',
					value: diffDate(targetUser.createdAt),
					inline: true,
				},
			)
		} else {
			logEmbed.addFields({
				name: 'Utilisateur',
				value: `<@${userId}> (ID : ${userId})`,
				inline: true,
			})
		}

		if (preuve) {
			logEmbed.setImage(preuve)
		}

		// Insertion du nouveau ban en base de données
		try {
			const sql =
				'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
			const data = [
				userId,
				targetUsername,
				targetAvatar,
				interaction.user.id,
				interaction.user.username,
				reason,
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
