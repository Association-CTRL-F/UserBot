export default async (guild, client) => {
	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	try {
		const sql = 'DELETE FROM config WHERE GUILD_ID = ?'
		const data = [guild.id]
		await bdd.execute(sql, data)
	} catch (error) {
		console.log(error)
	}

	try {
		const sql = 'DELETE FROM forms WHERE guildId = ?'
		const data = [guild.id]
		await bdd.execute(sql, data)
	} catch (error) {
		console.log(error)
	}
}
