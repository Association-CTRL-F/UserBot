import { convertDateForDiscord, diffDate, displayNameAndID } from '../../util/util.js'
import { AuditLogEvent, EmbedBuilder } from 'discord.js'

export default async (ban, client) => {
	if (ban.user.bot || !ban.guild.available) return

	// Acquisition du salon de logs
	const logsChannel = ban.guild.channels.cache.get(
		client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
	)
	if (!logsChannel) return

	// Fetch de l'event de ban
	const fetchedLog = (
		await ban.guild.fetchAuditLogs({
			type: AuditLogEvent.MemberBanAdd,
			limit: 1,
		})
	).entries.first()
	if (!fetchedLog) return

	// Fetch du ban
	const bannedUser = await ban.fetch()

	// Création de l'embed
	const logEmbed = new EmbedBuilder()
		.setColor('C9572A')
		.setAuthor({
			name: displayNameAndID(bannedUser.member, bannedUser.user),
			iconURL: bannedUser.user.displayAvatarURL({ dynamic: true }),
		})
		.addFields([
			{
				name: 'Mention',
				value: bannedUser.user.toString(),
				inline: true,
			},
			{
				name: 'Date de création du compte',
				value: convertDateForDiscord(bannedUser.user.createdAt),
				inline: true,
			},
			{
				name: 'Âge du compte',
				value: diffDate(bannedUser.user.createdAt),
				inline: true,
			},
		])
		.setTimestamp(new Date())

	const { executor, target } = fetchedLog

	if (executor.id === client.user.id) return

	// Détermination du modérateur ayant effectué le bannissement
	if (target.id === bannedUser.user.id && fetchedLog.createdTimestamp > Date.now() - 5000)
		logEmbed.data.footer = {
			icon_url: executor.displayAvatarURL({ dynamic: true }),
			text: `Membre banni par ${executor.tag}`,
		}
	else
		logEmbed.data.footer = {
			text: 'Membre banni',
		}

	// Raison du bannissement
	if (bannedUser.reason) {
		const escapedcontent = bannedUser.reason.replace(/```/g, '\\`\\`\\`')
		logEmbed.data.description = `\`\`\`\n${escapedcontent}\`\`\``
	}

	return logsChannel.send({ embeds: [logEmbed] })
}
