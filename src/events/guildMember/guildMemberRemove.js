import { convertDateForDiscord, diffDate } from '../../util/util.js'
import { MessageEmbed } from 'discord.js'

export default (guildMember, client) => {
	if (
		guildMember.user.bot ||
		guildMember.guild.id !== client.config.guild.guildID ||
		!guildMember.guild.available
	)
		return

	const leaveJoinChannel = guildMember.guild.channels.cache.get(
		client.config.guild.channels.leaveJoinChannelID,
	)
	if (!leaveJoinChannel) return

	const embedLeave = new MessageEmbed()
		.setColor('C9572A')
		.setAuthor({
			name: `${guildMember.displayName} (ID ${guildMember.id})`,
			iconURL: guildMember.user.displayAvatarURL({ dynamic: true }),
		})
		.addFields([
			{
				name: 'Mention',
				value: guildMember.toString(),
				inline: true,
			},
			{
				name: 'Date de création du compte',
				value: convertDateForDiscord(guildMember.user.createdAt),
				inline: true,
			},
			{
				name: 'Âge du compte',
				value: diffDate(guildMember.user.createdAt),
				inline: true,
			},
		])
		.setFooter({
			text: 'Un utilisateur a quitté le serveur',
		})
		.setTimestamp(new Date())

	if (guildMember.joinedAt)
		embedLeave.fields.push(
			{
				name: 'Serveur rejoint le',
				value: convertDateForDiscord(guildMember.joinedAt),
				inline: true,
			},
			{
				name: 'Était sur le serveur depuis',
				value: diffDate(guildMember.joinedAt),
				inline: true,
			},
		)

	return leaveJoinChannel.send({ embeds: [embedLeave] })
}
