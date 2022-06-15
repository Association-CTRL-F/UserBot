import { convertDateForDiscord, diffDate, displayNameAndID } from '../../util/util.js'
import { GuildAuditLogs, MessageEmbed } from 'discord.js'

export default async (ban, client) => {
	if (ban.user.bot || !ban.guild.available) return

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition des paramètres de la guild
	let configGuild = {}
	try {
		const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
		const dataSelect = [ban.guild.id]
		const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
		configGuild = resultSelect[0]
	} catch (error) {
		return console.log(error)
	}

	// Acquisition du salon de logs
	const logsChannel = ban.guild.channels.cache.get(configGuild.LOGS_BANS_CHANNEL_ID)
	if (!logsChannel) return

	// Fetch de l'event d'unban
	const fetchedLog = (
		await ban.guild.fetchAuditLogs({
			type: GuildAuditLogs.Actions.MEMBER_BAN_REMOVE,
			limit: 1,
		})
	).entries.first()
	if (!fetchedLog) return

	// Création de l'embed
	const logEmbed = new MessageEmbed()
		.setColor('57C92A')
		.setAuthor({
			name: displayNameAndID(ban.member, ban.user),
			iconURL: ban.user.displayAvatarURL({ dynamic: true }),
		})
		.addFields([
			{
				name: 'Mention',
				value: ban.user.toString(),
				inline: true,
			},
			{
				name: 'Date de création du compte',
				value: convertDateForDiscord(ban.user.createdAt),
				inline: true,
			},
			{
				name: 'Âge du compte',
				value: diffDate(ban.user.createdAt),
				inline: true,
			},
		])
		.setTimestamp(new Date())

	const { executor, target } = fetchedLog

	// Détermination du modérateur ayant effectué le débannissement
	if (target.id === ban.user.id && fetchedLog.createdTimestamp > Date.now() - 5000)
		logEmbed.footer = {
			iconURL: executor.displayAvatarURL({ dynamic: true }),
			text: `Membre débanni par ${executor.tag}`,
		}
	else
		logEmbed.footer = {
			text: 'Membre débanni',
		}

	return logsChannel.send({ embeds: [logEmbed] })
}
