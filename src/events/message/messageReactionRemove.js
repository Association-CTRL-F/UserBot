export default async (messageReaction, user, client) => {
	const { message, emoji } = messageReaction

	if (message.partial) await message.fetch()
	if (messageReaction.partial) await messageReaction.fetch()

	if (user.bot || !message.guild || !message.guild.available) return

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition des paramètres de la guild
	let configGuild = {}
	try {
		const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
		const dataSelect = [message.guild.id]
		const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
		configGuild = resultSelect[0]
	} catch (error) {
		return console.log(error)
	}

	// Partie système de réaction/role
	if (client.reactionRoleMap.has(message.id)) {
		const emojiRoleMap = client.reactionRoleMap.get(message.id)
		const resolvedEmoji = emoji.id || emoji.name
		const { id: roleID, giveJoinRole = false } = emojiRoleMap[resolvedEmoji]
		const guildMember = await message.guild.members.fetch(user)

		// Système rôle arrivant
		if (giveJoinRole) {
			const joinRole = configGuild.JOIN_ROLE_ID
			guildMember.roles.remove(joinRole)
		}

		return guildMember.roles.remove(roleID)
	}
}
