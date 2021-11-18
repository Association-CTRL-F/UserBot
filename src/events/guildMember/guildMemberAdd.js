import { convertDateForDiscord, diffDate, modifyWrongUsernames } from '../../util/util.js'

export default async (guildMember, client) => {
	const guild = guildMember.guild
	if (guildMember.user.bot || guild.id !== client.config.guildID || !guild.available) return

	modifyWrongUsernames(guildMember).catch(() => null)

	// Acquisition du channel de logs
	const leaveJoinChannel = guild.channels.cache.get(client.config.leaveJoinChannelID)
	if (!leaveJoinChannel) return

	// Envoi du message de join
	const sentMessage = await leaveJoinChannel.send({
		embeds: [
			{
				color: '57C92A',
				author: {
					name: `${guildMember.displayName} (ID ${guildMember.id})`,
					icon_url: guildMember.user.displayAvatarURL({ dynamic: true }),
				},
				fields: [
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
				],
				footer: {
					text: 'Un utilisateur a rejoint le serveur',
				},
				timestamp: new Date(),
			},
		],
	})

	// Ajout de la réaction pour ban (raid)
	const hammerReaction = await sentMessage.react('🔨')

	// Ajout de la réaction pour ban (double compte)
	const doubleHammersReaction = await sentMessage.react('<:doublecompte:910896944572952646>')

	// Filtre pour la réaction de ban
	const banReactionFilter = (messageReaction, user) =>
		messageReaction.emoji.name === '🔨' ||
		(messageReaction.emoji.id === '910896944572952646' &&
			guild.members.cache.get(user.id).permissionsIn(leaveJoinChannel).has('BAN_MEMBERS') &&
			!user.bot)

	// Création du collecteur de réactions de ban
	const banReactions = await sentMessage.awaitReactions({
		filter: banReactionFilter,
		// Une seule réaction/émoji/user
		max: 1,
		maxEmojis: 1,
		maxUsers: 1,
		// 12 heures = 4,32e+7 ms
		idle: 43200000,
	})

	// Si pas de réaction, suppression de la réaction "hammer"
	if (!banReactions.size) return hammerReaction.remove() && doubleHammersReaction.remove()

	// Acquisition de la réaction de ban et de son user
	const banReaction = banReactions.first()
	const banReactionUser = banReaction.users.cache.filter(user => !user.bot).first()

	// Définition de la variable "reason" suivant la réaction cliquée
	if (banReaction.emoji.name === '🔨') {
		var reason = 'UserBot - Raid'
	}
	if (banReaction.emoji.id === '910896944572952646') {
		var reason = 'UserBot - Double compte'
	}

	// Ajout de la réaction de confirmation
	const checkReaction = await sentMessage.react('✅')

	// Filtre pour la réqction de confirmation
	const confirmReactionFilter = (messageReaction, user) =>
		messageReaction.emoji.name === '✅' && user === banReactionUser && !user.bot

	// Création du collecteur de réactions de confirmation
	const confirmReaction = await sentMessage.awaitReactions({
		filter: confirmReactionFilter,
		// Une seule réaction/émoji/user
		max: 1,
		maxEmojis: 1,
		maxUsers: 1,
		// 5 minutes = 300000 ms
		idle: 300000,
	})

	// Suppression des émotes précédentes
	await Promise.all([
		hammerReaction.remove(),
		doubleHammersReaction.remove(),
		checkReaction.remove(),
	])

	// Si pas de réaction return
	if (!confirmReaction) return

	// Si le membre n'est pas bannisable, réaction avec ❌
	if (!guildMember.bannable) return sentMessage.react('❌')

	// Ban du membre
	const banAction = guildMember.ban({ days: 7, reason: reason }).catch(() => null)

	// Si erreur lors du ban, réaction avec ⚠️
	if (!banAction) return sentMessage.react('⚠️')

	// Sinon réaction avec 🚪 pour confirmer le ban
	return sentMessage.react('🚪')
}
