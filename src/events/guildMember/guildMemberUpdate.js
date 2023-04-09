import { modifyWrongUsernames } from '../../util/util.js'
import { RESTJSONErrorCodes } from 'discord.js'
import ms from 'ms'

export default async (oldGuildMember, newGuildMember, client) => {
	const isBot = oldGuildMember.user.bot || newGuildMember.user.bot
	if (isBot) return

	if (oldGuildMember.pending === true && newGuildMember.pending === false) {
		const memberRole = client.config.guild.roles.MEMBER_ROLE_ID
		const joinRole = client.config.guild.roles.JOIN_ROLE_ID
		await newGuildMember.roles.add(memberRole)
		await newGuildMember.roles.add(joinRole)

		setTimeout(
			() =>
				newGuildMember.roles.remove(joinRole).catch(error => {
					if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
				}),
			ms(client.config.guild.TIMEOUT_JOIN),
		)
	}

	modifyWrongUsernames(newGuildMember).catch(() => null)
}
