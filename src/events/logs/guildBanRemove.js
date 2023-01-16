import { convertDateForDiscord, diffDate, displayNameAndID } from '../../util/util.js'
import { AuditLogEvent, EmbedBuilder } from 'discord.js'

export default async (ban, client) => {
	if (ban.user.bot || !ban.guild.available) return

	// Acquisition du salon de logs
	const logsChannel = ban.guild.channels.cache.get(
		client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
	)
	if (!logsChannel) return

	// Fetch de l'event d'unban
	const fetchedLog = (
		await ban.guild.fetchAuditLogs({
			type: AuditLogEvent.MemberBanRemove,
			limit: 1,
		})
	).entries.first()
	if (!fetchedLog) return

	// Création de l'embed
	const logEmbed = new EmbedBuilder()
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

	if (executor.id === client.user.id) return

	// Détermination du modérateur ayant effectué le débannissement
	if (target.id === ban.user.id && fetchedLog.createdTimestamp > Date.now() - 5000)
		logEmbed.data.footer = {
			icon_url: executor.displayAvatarURL({ dynamic: true }),
			text: `Membre débanni par ${executor.tag}`,
		}
	else
		logEmbed.data.footer = {
			text: 'Membre débanni',
		}

	return logsChannel.send({ embeds: [logEmbed] })
}
