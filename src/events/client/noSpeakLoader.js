import { RESTJSONErrorCodes } from 'discord.js'
import ms from 'ms'

export default async (client, guild) => {
	const joinRoleId = client.config.guild.roles.JOIN_ROLE_ID
	const timeoutJoin = client.config.guild.TIMEOUT_JOIN

	if (!joinRoleId || !timeoutJoin) return

	const joinRole = guild.roles.cache.get(joinRoleId)
	if (!joinRole) return

	const timeoutMs = ms(timeoutJoin)
	if (typeof timeoutMs !== 'number') return

	for (const [, noBlablaMember] of joinRole.members) {
		if (!noBlablaMember.joinedAt) continue

		const elapsedMs = Date.now() - noBlablaMember.joinedAt.getTime()
		const remainingMs = timeoutMs - elapsedMs

		if (remainingMs <= 0) {
			await noBlablaMember.roles.remove(joinRoleId).catch((error) => {
				if (error.code !== RESTJSONErrorCodes.UnknownMember) {
					console.error(error)
				}
			})
			continue
		}

		globalThis.setTimeout(() => {
			noBlablaMember.roles.remove(joinRoleId).catch((error) => {
				if (error.code !== RESTJSONErrorCodes.UnknownMember) {
					console.error(error)
				}
			})
		}, remainingMs)
	}
}
