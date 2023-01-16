import { RESTJSONErrorCodes } from 'discord.js'
import ms from 'ms'

export default (client, guild) => {
	const joinRole = client.config.guild.roles.JOIN_ROLE_ID
	const timeoutJoin = client.config.guild.TIMEOUT_JOIN

	guild.roles.cache.get(joinRole).members.map(async noblablaMember => {
		const diff = new Date() - noblablaMember.joinedAt
		const minutesPresence = Math.floor((diff / (1000 * 60 * 60 * 24 * 30.4375)) * 43800)
		const msPresence = minutesPresence * 60000

		if (msPresence > ms(timeoutJoin))
			await noblablaMember.roles.remove(joinRole).catch(error => {
				if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
			})

		setTimeout(
			() =>
				noblablaMember.roles.remove(joinRole).catch(error => {
					if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
				}),
			ms(timeoutJoin),
		)
	})
}
