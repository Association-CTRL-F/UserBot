export default async (messageReaction, user, client) => {
	const { message, emoji } = messageReaction

	if (message.partial) await message.fetch()
	if (messageReaction.partial) await messageReaction.fetch()

	if (user.bot || !message.guild || !message.guild.available) return

	// Partie système de réaction / rôle
	if (client.reactionRoleMap.has(message.id)) {
		const emojiRoleMap = client.reactionRoleMap.get(message.id)
		const resolvedEmoji = emoji.id || emoji.name
		const { id: roleID } = emojiRoleMap[resolvedEmoji]
		const guildMember = await message.guild.members.fetch(user)

		return guildMember.roles.remove(roleID)
	}
}
