import { modifyWrongUsernames } from '../../util/util.js'
import { RESTJSONErrorCodes } from 'discord.js'
import ms from 'ms'

export default async (oldGuildMember, newGuildMember, client) => {
	const isBot = oldGuildMember.user.bot || newGuildMember.user.bot
	if (isBot || !newGuildMember.guild.available) return

	if (oldGuildMember.pending === true && newGuildMember.pending === false) {
		const memberRole = client.config.guild.roles.MEMBER_ROLE_ID
		const joinRole = client.config.guild.roles.JOIN_ROLE_ID

		if (!memberRole || !joinRole) return

		try {
			await Promise.all([
				newGuildMember.roles.add(memberRole),
				newGuildMember.roles.add(joinRole),
			])
		} catch (error) {
			if (error.code !== RESTJSONErrorCodes.UnknownMember) {
				console.error(error)
			}
			return
		}

		globalThis.setTimeout(() => {
			newGuildMember.roles.remove(joinRole).catch((error) => {
				if (error.code !== RESTJSONErrorCodes.UnknownMember) {
					console.error(error)
				}
			})
		}, ms(client.config.guild.TIMEOUT_JOIN))
	}

	modifyWrongUsernames(newGuildMember).catch(() => null)
}
