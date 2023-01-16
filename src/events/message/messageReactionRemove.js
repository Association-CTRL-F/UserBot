export default async (messageReaction, user, client) => {
	const { message, emoji } = messageReaction

	if (message.partial) await message.fetch()
	if (messageReaction.partial) await messageReaction.fetch()

	if (user.bot || !message.guild || !message.guild.available) return

	// Partie système de réaction / rôle
	if (client.reactionRoleMap.has(message.id)) {
		const emojiRoleMap = client.reactionRoleMap.get(message.id)
		const resolvedEmoji = emoji.id || emoji.name
		const { id: roleID, giveJoinRole = false } = emojiRoleMap[resolvedEmoji]
		const guildMember = await message.guild.members.fetch(user)

		// Système rôle arrivant
		if (giveJoinRole) {
			const joinRole = client.config.guild.roles.JOIN_ROLE_ID
			guildMember.roles.remove(joinRole)
		}

		return guildMember.roles.remove(roleID)
	}
}
