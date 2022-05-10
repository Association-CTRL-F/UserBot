import { modifyWrongUsernames } from '../../util/util.js'

export default (oldGuildMember, newMGuildMember, client) => {
	const guild = oldGuildMember.guild || newMGuildMember.guild
	const isBot = oldGuildMember.user.bot || newMGuildMember.user.bot
	if (isBot || guild.id !== client.config.guild.guildID) return

	modifyWrongUsernames(newMGuildMember).catch(() => null)
}
