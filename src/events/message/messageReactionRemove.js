export default async (messageReaction) => {
	const { message } = messageReaction

	if (message.partial) {
		await message.fetch().catch(() => null)
		if (message.partial) return
	}

	if (messageReaction.partial) {
		await messageReaction.fetch().catch(() => null)
	}
}
