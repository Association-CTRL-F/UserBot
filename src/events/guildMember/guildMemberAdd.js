import {
	convertDateForDiscord,
	diffDate,
	modifyWrongUsernames,
	displayNameAndID,
} from '../../util/util.js'
import { readFile } from 'fs/promises'
import { PermissionsBitField, EmbedBuilder, RESTJSONErrorCodes } from 'discord.js'

const removeBotReactions = async (reactions) =>
	Promise.all(reactions.map((reaction) => reaction.remove().catch(() => null)))

export default async (guildMember, client) => {
	const guild = guildMember.guild
	if (guildMember.user.bot || !guild.available) return

	modifyWrongUsernames(guildMember).catch(() => null)

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return
	}

	// Acquisition de la base de données Moderation
	const bddModeration = client.config.db.pools.moderation
	if (!bddModeration) {
		console.log('Une erreur est survenue lors de la connexion à la base de données Moderation')
		return
	}

	// Acquisition du salon de logs join-leave
	const leaveJoinChannel = guild.channels.cache.get(
		client.config.guild.channels.LEAVE_JOIN_CHANNEL_ID,
	)
	if (!leaveJoinChannel) return

	// Acquisition du salon de logs liste-ban
	const logsChannel = guild.channels.cache.get(client.config.guild.channels.LOGS_BANS_CHANNEL_ID)
	if (!logsChannel) return

	// Envoi du message de join
	const embedJoin = new EmbedBuilder()
		.setColor(0x57c92a)
		.setAuthor({
			name: displayNameAndID(guildMember),
			iconURL: guildMember.user.displayAvatarURL({ dynamic: true }),
		})
		.addFields(
			{
				name: 'Mention',
				value: guildMember.toString(),
				inline: true,
			},
			{
				name: 'Date de création du compte',
				value: convertDateForDiscord(guildMember.user.createdAt),
				inline: true,
			},
			{
				name: 'Âge du compte',
				value: diffDate(guildMember.user.createdAt),
				inline: true,
			},
		)
		.setFooter({
			text: 'Un utilisateur a rejoint le serveur',
		})
		.setTimestamp(new Date())

	const sentMessage = await leaveJoinChannel.send({
		embeds: [embedJoin],
	})

	// Si le membre n'est pas bannable, réaction avec 🚫
	if (!guildMember.bannable) {
		await sentMessage.react('🚫').catch(() => null)
		return
	}

	// Lecture du fichier de configuration
	let emotesConfig
	try {
		emotesConfig = new Map(
			JSON.parse(await readFile('./config/env/banEmotesAtJoin.json', 'utf8')),
		)
	} catch (error) {
		console.error(error)
		await sentMessage.react('⚠️').catch(() => null)
		return
	}

	// Ajout des réactions de choix
	const reactionsList = []
	for (const [emoji] of emotesConfig) {
		const sentReaction = await sentMessage.react(emoji).catch(() => null)
		if (sentReaction) reactionsList.push(sentReaction)
	}

	// Filtre pour la réaction de ban
	const banReactionFilter = (messageReaction, user) => {
		if (user.bot) return false

		const emojiName = messageReaction.emoji.name
		const emojiId = messageReaction.emoji.id

		const hasMatchingEmoji = emotesConfig.has(emojiName) || emotesConfig.has(emojiId)
		if (!hasMatchingEmoji) return false

		return leaveJoinChannel.permissionsFor(user)?.has(PermissionsBitField.Flags.BanMembers)
	}

	// Création du collecteur de réactions de ban
	const banReactions = await sentMessage.awaitReactions({
		filter: banReactionFilter,
		max: 1,
		maxEmojis: 1,
		maxUsers: 1,
		idle: 43200000, // 12 heures
	})

	// On supprime les réactions ajoutées
	await removeBotReactions(reactionsList, client)

	// Si pas de réaction, return
	if (!banReactions.size) return

	// Acquisition de la réaction de ban et de son user
	const firstBanReaction = banReactions.first()
	if (!firstBanReaction) return

	const banReactionUser = firstBanReaction.users.cache.find((user) => !user.bot)
	if (!banReactionUser) return

	const banReactionEmoji = firstBanReaction.emoji

	// Ajout de la réaction de confirmation
	const confirmationReaction = await sentMessage.react('✅').catch(() => null)
	if (!confirmationReaction) return

	// Filtre pour la réaction de confirmation
	const confirmReactionFilter = (messageReaction, user) =>
		messageReaction.emoji.name === '✅' && user.id === banReactionUser.id

	// Création du collecteur de réactions de confirmation
	const confirmationReactions = await sentMessage.awaitReactions({
		filter: confirmReactionFilter,
		max: 1,
		maxEmojis: 1,
		maxUsers: 1,
		idle: 300000, // 5 minutes
	})

	// On supprime la réaction ✅ du bot
	await confirmationReaction.remove().catch(() => null)

	// Si pas de réaction de confirmation, return
	if (!confirmationReactions.size) return

	// Définition de la variable 'reason' en fonction de la réaction cliquée
	const reason = emotesConfig.get(banReactionEmoji.name) || emotesConfig.get(banReactionEmoji.id)

	if (!reason) return

	// Acquisition du message de bannissement
	let banDM = ''
	try {
		const sqlSelectBan = 'SELECT * FROM forms WHERE name = ?'
		const dataSelectBan = ['ban']
		const [resultSelectBan] = await bdd.execute(sqlSelectBan, dataSelectBan)

		if (!resultSelectBan?.[0]?.content) {
			console.log('Aucun contenu trouvé pour le message de bannissement en base de données')
			return
		}

		banDM = resultSelectBan[0].content
	} catch (error) {
		console.error(error)
		return
	}

	// Envoi du message de bannissement en message privé
	const dmEmbed = new EmbedBuilder()
		.setColor('#C27C0E')
		.setTitle('Bannissement')
		.setDescription(banDM)
		.setAuthor({
			name: guild.name,
			iconURL: guild.iconURL({ dynamic: true }),
			url: guild.vanityURL ?? undefined,
		})
		.addFields({
			name: 'Raison du bannissement',
			value: reason,
		})

	let dmMessage = null
	let dmFailed = false

	try {
		dmMessage = await guildMember.send({
			embeds: [dmEmbed],
		})
		await sentMessage.react('📩').catch(() => null)
	} catch (error) {
		if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
			dmFailed = true
			await sentMessage.react('⛔').catch(() => null)
		} else {
			console.error(error)
			dmFailed = true
			await sentMessage.react('⚠️').catch(() => null)
		}
	}

	// Ban du membre
	try {
		await guildMember.ban({
			deleteMessageSeconds: 604800,
			reason: `${banReactionUser.tag} : ${reason}`,
		})
	} catch (error) {
		console.error(error)
		await sentMessage.react('❌').catch(() => null)

		// Si un DM a été envoyé, on l'édite en avertissement
		if (dmMessage) {
			const warningEmbed = new EmbedBuilder()
				.setColor('#C27C0E')
				.setTitle('Avertissement')
				.setDescription('Tu as reçu un avertissement !')
				.setAuthor({
					name: guild.name,
					iconURL: guild.iconURL({ dynamic: true }),
					url: guild.vanityURL ?? undefined,
				})
				.addFields({
					name: "Raison de l'avertissement",
					value: reason,
				})

			await dmMessage
				.edit({
					embeds: [warningEmbed],
				})
				.catch(() => null)
		}

		return
	}

	// Si le ban a réussi, réaction avec 🚪 pour confirmer
	await sentMessage.react('🚪').catch(() => null)

	// Insertion du nouveau ban en base de données
	try {
		const sql =
			'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
		const data = [
			guildMember.user.id,
			guildMember.user.username,
			guildMember.user.avatar ?? null,
			banReactionUser.id,
			banReactionUser.username,
			`${reason} (réaction)`,
			Math.round(Date.now() / 1000),
		]

		await bddModeration.execute(sql, data)
	} catch (error) {
		console.error(error)
	}

	// Création de l'embed de log
	const logEmbed = new EmbedBuilder()
		.setColor(0xc9572a)
		.setAuthor({
			name: displayNameAndID(guildMember, guildMember.user),
			iconURL: guildMember.displayAvatarURL({ dynamic: true }),
		})
		.setDescription(`\`\`\`\n${banReactionUser.tag} : ${reason} (réaction)\n\`\`\``)
		.addFields(
			{
				name: 'Mention',
				value: guildMember.toString(),
				inline: true,
			},
			{
				name: 'Date de création du compte',
				value: convertDateForDiscord(guildMember.user.createdAt),
				inline: true,
			},
			{
				name: 'Âge du compte',
				value: diffDate(guildMember.user.createdAt),
				inline: true,
			},
		)
		.setFooter({
			iconURL: banReactionUser.displayAvatarURL({ dynamic: true }),
			text: `Membre banni par ${banReactionUser.tag}`,
		})
		.setTimestamp(new Date())

	if (dmFailed) {
		logEmbed.addFields({
			name: 'DM',
			value: "Le message privé n'a pas pu être envoyé.",
			inline: false,
		})
	}

	return logsChannel.send({ embeds: [logEmbed] })
}
