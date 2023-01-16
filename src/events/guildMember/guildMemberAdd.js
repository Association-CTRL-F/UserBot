import {
	convertDateForDiscord,
	diffDate,
	modifyWrongUsernames,
	displayNameAndID,
} from '../../util/util.js'
import { readFile } from 'fs/promises'
import {
	PermissionsBitField,
	Message,
	GuildMember,
	EmbedBuilder,
	RESTJSONErrorCodes,
} from 'discord.js'

const removeAddedReactions = reactions => Promise.all(reactions.map(reaction => reaction.remove()))

export default async (guildMember, client) => {
	const guild = guildMember.guild
	if (guildMember.user.bot || !guild.available) return

	modifyWrongUsernames(guildMember).catch(() => null)

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

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
		.setColor('57C92A')
		.setAuthor({
			name: displayNameAndID(guildMember),
			iconURL: guildMember.user.displayAvatarURL({ dynamic: true }),
		})
		.addFields([
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
		])
		.setFooter({
			text: 'Un utilisateur a rejoint le serveur',
		})
		.setTimestamp(new Date())

	const sentMessage = await leaveJoinChannel.send({
		embeds: [embedJoin],
	})

	// Si le membre n'est pas bannisable, réaction avec 🚫
	if (!guildMember.bannable) return sentMessage.react('🚫')

	// Lecture du fichier de configuration
	const emotesConfig = new Map(JSON.parse(await readFile('./config/env/banEmotesAtJoin.json')))

	const reactionsList = []
	for (const [emoji] of emotesConfig) {
		// eslint-disable-next-line no-await-in-loop
		const sentReaction = await sentMessage.react(emoji)
		reactionsList.push(sentReaction)
	}

	// Filtre pour la réaction de ban
	const banReactionFilter = ({ _emoji: emoji }, user) =>
		(emotesConfig.has(emoji.name) || emotesConfig.has(emoji.id)) &&
		guild.members.cache
			.get(user.id)
			.permissionsIn(leaveJoinChannel)
			.has(PermissionsBitField.Flags.BanMembers) &&
		!user.bot

	// Création du collecteur de réactions de ban
	const banReactions = await sentMessage.awaitReactions({
		filter: banReactionFilter,
		// Une seule réaction / émoji / user
		max: 1,
		maxEmojis: 1,
		maxUsers: 1,
		// 12 heures = 4,32e+7 ms
		idle: 43200000,
	})

	// Si réaction correcte ajoutée ou temps écoulé,
	// on supprime les réactions ajoutées
	await removeAddedReactions(reactionsList)

	// Si pas de réaction, return
	if (!banReactions.size) return

	// Acquisition de la réaction de ban et de son user
	const { users: banReactionUsers, _emoji: banReactionEmoji } = banReactions.first()
	const banReactionUser = banReactionUsers.cache.filter(user => !user.bot).first()

	// Ajout de la réaction de confirmation
	const confirmationReaction = await sentMessage.react('✅')

	// Filtre pour la réaction de confirmation
	const confirmReactionFilter = (messageReaction, user) =>
		messageReaction.emoji.name === '✅' && user === banReactionUser

	// Création du collecteur de réactions de confirmation
	const confirmationReactions = await sentMessage.awaitReactions({
		filter: confirmReactionFilter,
		// Une seule réaction / émoji / user
		max: 1,
		maxEmojis: 1,
		maxUsers: 1,
		// 5 minutes = 300000 ms
		idle: 300000,
	})

	// Si réaction correcte ajoutée ou temps écoulé,
	// on supprime la réaction de confirmation
	await confirmationReaction.remove()

	// Si pas de réaction de confirmation return
	if (!confirmationReactions) return

	// Définition de la variable "reason" en fonction de la réaction cliquée
	const reason = emotesConfig.get(banReactionEmoji.name) || emotesConfig.get(banReactionEmoji.id)

	// Acquisition du message de bannissement
	let banDM = ''
	try {
		const sqlSelectBan = 'SELECT * FROM forms WHERE name = ?'
		const dataSelectBan = ['ban']
		const [resultSelectBan] = await bdd.execute(sqlSelectBan, dataSelectBan)

		banDM = resultSelectBan[0].content
	} catch {
		return console.log(
			'Une erreur est survenue lors de la récupération du message de bannissement en base de données 😬',
		)
	}

	// Envoi du message de bannissement en message privé
	const embed = new EmbedBuilder()
		.setColor('#C27C0E')
		.setTitle('Bannissement')
		.setDescription(banDM)
		.setAuthor({
			name: guild.name,
			iconURL: guild.iconURL({ dynamic: true }),
			url: guild.vanityURL,
		})
		.addFields([
			{
				name: 'Raison du bannissement',
				value: reason,
			},
		])

	const DMMessage = await guildMember
		.send({
			embeds: [embed],
		})
		.catch(async error => {
			if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser)
				return sentMessage.react('⛔')

			console.error(error)
			await sentMessage.react('⚠️')
			return error
		})

	// Si le message a bien été envoyé, ajout réaction 📩
	if (DMMessage instanceof Message) await sentMessage.react('📩')

	// Ban du membre
	const banAction = await guildMember
		.ban({ deleteMessageSeconds: 604800, reason: `${banReactionUser.tag} : ${reason}` })
		.catch(async error => {
			console.error(error)
			await sentMessage.react('❌')

			// Edit du message envoyé en DM
			const editedDMEmbedBuilder = new EmbedBuilder(DMMessage.embeds[0])
			editedDMEmbedBuilder.title = 'Avertissement'
			editedDMEmbedBuilder.description = 'Tu as reçu un avertissement !'
			editedDMEmbedBuilder.fields[0].name = "Raison de l'avertissement"
			await DMMessage.edit({
				embeds: [editedDMEmbedBuilder],
			})

			return error
		})

	// Si pas d'erreur, réaction avec 🚪 pour confirmer le ban
	if (banAction instanceof GuildMember) {
		await sentMessage.react('🚪')

		// Création de l'embed
		const logEmbed = new EmbedBuilder()
			.setColor('C9572A')
			.setAuthor({
				name: displayNameAndID(banAction, banAction),
				iconURL: banAction.displayAvatarURL({ dynamic: true }),
			})
			.setDescription(`\`\`\`\n${banReactionUser.tag} : ${reason} (réaction)\`\`\``)
			.addFields([
				{
					name: 'Mention',
					value: banAction.toString(),
					inline: true,
				},
				{
					name: 'Date de création du compte',
					value: convertDateForDiscord(banAction.user.createdAt),
					inline: true,
				},
				{
					name: 'Âge du compte',
					value: diffDate(banAction.user.createdAt),
					inline: true,
				},
			])
			.setFooter({
				iconURL: banReactionUser.displayAvatarURL({ dynamic: true }),
				text: `Membre banni par ${banReactionUser.tag}`,
			})
			.setTimestamp(new Date())

		return logsChannel.send({ embeds: [logEmbed] })
	}

	// Si au moins une erreur, throw
	if (banAction instanceof Error || DMMessage instanceof Error)
		throw new Error(
			"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
		)
}
