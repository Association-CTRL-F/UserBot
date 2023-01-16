export default async (bdd, guild) => {
	// / Acquisition des vocaux depuis la base de données
	let voiceChannels = []
	try {
		const sql = 'SELECT * FROM vocal'
		const [result] = await bdd.execute(sql)
		voiceChannels = result
	} catch (error) {
		return console.error(error)
	}

	if (voiceChannels)
		voiceChannels.forEach(async voiceChannel => {
			const channel = await guild.channels.cache.get(voiceChannel.channel)

			if (channel && channel.members.size === 0) await channel.delete()

			const sql = 'DELETE FROM vocal WHERE channelId = ?'
			const data = [voiceChannel.channel]
			bdd.execute(sql, data)
		})
}
