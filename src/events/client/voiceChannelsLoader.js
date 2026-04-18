export default async (client, bdd, guild) => {
	if (!guild?.available) return

	// Acquisition des vocaux depuis la base de données
	let voiceChannels = []
	try {
		const sql = 'SELECT * FROM vocal'
		const [result] = await bdd.execute(sql)
		voiceChannels = result ?? []
	} catch (error) {
		console.error(error)
		return
	}

	if (!voiceChannels.length) return

	for (const voiceChannel of voiceChannels) {
		const channel = guild.channels.cache.get(voiceChannel.channelId)

		// Si le salon n'existe plus, on nettoie la base et le manager
		if (!channel) {
			try {
				const sql = 'DELETE FROM vocal WHERE channelId = ?'
				const data = [voiceChannel.channelId]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			client.voiceManager.delete(voiceChannel.channelId)
			continue
		}

		// Si ce n'est pas un salon vocal, on nettoie aussi
		if (!channel.isVoiceBased()) {
			try {
				const sql = 'DELETE FROM vocal WHERE channelId = ?'
				const data = [voiceChannel.channelId]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			client.voiceManager.delete(voiceChannel.channelId)
			continue
		}

		if (channel.members.size === 0) {
			try {
				await channel.delete()

				const sql = 'DELETE FROM vocal WHERE channelId = ?'
				const data = [voiceChannel.channelId]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}

			client.voiceManager.delete(voiceChannel.channelId)
			continue
		}

		client.voiceManager.set(voiceChannel.channelId, null)
	}
}
