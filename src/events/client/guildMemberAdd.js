const { convertDate, diffDate } = require('../../util/util')

module.exports = (client, guildMember) => {
	if (guildMember.user.bot || guildMember.guild.id !== client.config.guildID) return

	if (
		guildMember.displayName.match(
			/^[^a-zA-Z0-9áàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ].*/,
		)
	)
		guildMember.edit({ nick: 'Mon pseudo ne respècte pas les règles !' })

	const leaveJoinChannel = guildMember.guild.channels.cache.find(
		channel => channel.id === client.config.leaveJoinChannelID,
	)

	leaveJoinChannel.send({
		embed: {
			color: '57C92A',
			author: {
				name: `${guildMember.user.tag} (ID ${guildMember.id})`,
				icon_url: guildMember.user.displayAvatarURL({ dynamic: true }),
			},
			description: `<@${guildMember.id}>`,
			fields: [
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
				text: `Un utilisateur a rejoint le serveur • ${convertDate(new Date())}`,
			},
		},
	})
}
