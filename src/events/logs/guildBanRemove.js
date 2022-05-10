import { convertDateForDiscord, diffDate } from '../../util/util.js'
import { GuildAuditLogs } from 'discord.js'

export default async (ban, client) => {
	if (ban.user.bot || ban.guild.id !== client.config.guild.guildID || !ban.guild.available) return

	// Acquisition du salon de logs
	const logsChannel = ban.guild.channels.cache.get(client.config.guild.channels.logsBansChannelID)
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
	const logEmbed = {
		color: '57C92A',
		author: {
			name: `${ban.user.username} (ID ${ban.user.id})`,
			icon_url: ban.user.displayAvatarURL({ dynamic: true }),
		},
		fields: [
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
		],
		timestamp: new Date(),
	}

	const { executor, target } = fetchedLog

	// Détermination du modérateur ayant effectué le débannissement
	if (target.id === ban.user.id && fetchedLog.createdTimestamp > Date.now() - 5000)
		logEmbed.footer = {
			icon_url: executor.displayAvatarURL({ dynamic: true }),
			text: `Membre débanni par ${executor.tag}`,
		}
	else
		logEmbed.footer = {
			text: 'Membre débanni',
		}

	return logsChannel.send({ embeds: [logEmbed] })
}
