export default async (messageReaction, user, client) => {
	const { message } = messageReaction

	if (message.partial) {
		await message.fetch().catch(() => null)
		if (message.partial) return
	}

	if (messageReaction.partial) {
		await messageReaction.fetch().catch(() => null)
		if (messageReaction.partial) return
	}

	if (user.bot || !message.guild || !message.guild.available) return
}
