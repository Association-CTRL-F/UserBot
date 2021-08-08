import { convertDate, diffDate } from '../../util/util.js'

export default (guildMember, client) => {
	if (
		guildMember.user.bot ||
		guildMember.guild.id !== client.config.guildID ||
		!guildMember.guild.available
	)
		return

	const leaveJoinChannel = guildMember.guild.channels.cache.get(client.config.leaveJoinChannelID)
	if (!leaveJoinChannel) return

	const embed = {
		color: 'C9572A',
		author: {
			name: `${guildMember.displayName} (ID ${guildMember.id})`,
			icon_url: guildMember.user.displayAvatarURL({ dynamic: true }),
		},
		fields: [
			{
				name: 'Mention',
				value: guildMember,
				inline: true,
			},
			{
				name: 'Date de création du compte',
				value: convertDate(guildMember.user.createdAt),
				inline: true,
			},
			{
				name: 'Âge du compte',
				value: diffDate(guildMember.user.createdAt),
				inline: true,
			},
		],
		footer: {
			text: 'Un utilisateur a quitté le serveur',
		},
		timestamp: new Date(),
	}

	if (guildMember.joinedAt)
		embed.fields.push(
			{
				name: 'Serveur rejoint le',
				value: convertDate(guildMember.joinedAt),
				inline: true,
			},
			{
				name: 'Était sur le serveur depuis',
				value: diffDate(guildMember.joinedAt),
				inline: true,
			},
		)

	return leaveJoinChannel.send({ embeds: [embed] })
}
