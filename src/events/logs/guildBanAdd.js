import { convertDateForDiscord, diffDate } from '../../util/util.js'
import { Util, GuildAuditLogs } from 'discord.js'

export default async (ban, client) => {
	if (ban.user.bot || ban.guild.id !== client.config.guild.guildID || !ban.guild.available) return

	// Acquisition du salon de logs
	const logsChannel = ban.guild.channels.cache.get(client.config.guild.channels.logsBansChannelID)
	if (!logsChannel) return

	// Fetch de l'event de ban
	const fetchedLog = (
		await ban.guild.fetchAuditLogs({
			type: GuildAuditLogs.Actions.MEMBER_BAN_ADD,
			limit: 1,
		})
	).entries.first()
	if (!fetchedLog) return

	// Fetch du ban
	const bannedUser = await ban.fetch()

	// Création de l'embed
	const logEmbed = {
		color: 'C9572A',
		author: {
			name: `${bannedUser.user.username} (ID ${bannedUser.user.id})`,
			icon_url: bannedUser.user.displayAvatarURL({ dynamic: true }),
		},
		fields: [
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
		],
		timestamp: new Date(),
	}

	const { executor, target } = fetchedLog

	// Détermination du modérateur ayant effectué le bannissement
	if (target.id === bannedUser.user.id && fetchedLog.createdTimestamp > Date.now() - 5000)
		logEmbed.footer = {
			icon_url: executor.displayAvatarURL({ dynamic: true }),
			text: `Membre banni par ${executor.tag}`,
		}
	else
		logEmbed.footer = {
			text: 'Membre banni',
		}

	// Raison du bannissement
	if (bannedUser.reason) {
		const escapedcontent = Util.escapeCodeBlock(bannedUser.reason)
		logEmbed.description = `\`\`\`\n${escapedcontent}\`\`\``
	}

	return logsChannel.send({ embeds: [logEmbed] })
}
