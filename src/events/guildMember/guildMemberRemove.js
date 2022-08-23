import { convertDateForDiscord, diffDate, displayNameAndID } from '../../util/util.js'
import { EmbedBuilder } from 'discord.js'

export default async (guildMember, client) => {
	const guild = guildMember.guild
	if (guildMember.user.bot || !guild.available) return

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition des paramètres de la guild
	let configGuild = {}
	try {
		const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
		const dataSelect = [guild.id]
		const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
		configGuild = resultSelect[0]
	} catch (error) {
		return console.log(error)
	}

	// Acquisition du salon de logs
	const leaveJoinChannel = guild.channels.cache.get(configGuild.LEAVE_JOIN_CHANNEL_ID)
	if (!leaveJoinChannel) return

	const embedLeave = new EmbedBuilder()
		.setColor('C9572A')
		.setAuthor({
			name: displayNameAndID(guildMember),
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
		embedLeave.data.fields.push(
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
