import { modifyWrongUsernames } from '../../util/util.js'

export default (oldGuildMember, newMGuildMember) => {
	const isBot = oldGuildMember.user.bot || newMGuildMember.user.bot
	if (isBot) return

	modifyWrongUsernames(newMGuildMember).catch(() => null)
}
