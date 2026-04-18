import { convertDateForDiscord, diffDate } from '../../util/util.js'
import { AuditLogEvent, EmbedBuilder, PermissionFlagsBits } from 'discord.js'

export default async (ban, client) => {
	if (ban.user.bot || !ban.guild.available) return

	// Acquisition du salon de logs
	const logsChannel = ban.guild.channels.cache.get(
		client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
	)
	if (!logsChannel) return

	// Récupération complète du ban si possible
	const bannedUser = await ban.fetch().catch(() => ban)
	if (!bannedUser?.user) return

	// Récupération éventuelle du log d'audit
	let fetchedLog = null
	const me = ban.guild.members.me

	if (me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
		// Petit délai pour laisser le temps au log d'apparaître
		await new Promise((resolve) => globalThis.setTimeout(resolve, 1200))

		const auditLogs = await ban.guild
			.fetchAuditLogs({
				type: AuditLogEvent.MemberBanAdd,
				limit: 6,
			})
			.catch(() => null)

		if (auditLogs) {
			fetchedLog =
				auditLogs.entries.find((entry) => {
					const sameTarget = entry.target?.id === bannedUser.user.id
					const recentEnough = Date.now() - entry.createdTimestamp < 10_000
					return sameTarget && recentEnough
				}) ?? null
		}
	}

	// Ignore les bans effectués par le bot lui-même
	if (fetchedLog?.executor?.id === client.user.id) return

	// Création de l'embed
	const logEmbed = new EmbedBuilder()
		.setColor(0xc9572a)
		.setAuthor({
			name: `${bannedUser.user.tag} (ID : ${bannedUser.user.id})`,
			iconURL: bannedUser.user.displayAvatarURL({ dynamic: true }),
		})
		.addFields(
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
		)
		.setTimestamp(new Date())

	// Détermination du modérateur ayant effectué le bannissement
	if (fetchedLog?.executor && fetchedLog?.target?.id === bannedUser.user.id) {
		logEmbed.setFooter({
			iconURL: fetchedLog.executor.displayAvatarURL({ dynamic: true }),
			text: `Membre banni par ${fetchedLog.executor.tag}`,
		})
	} else {
		logEmbed.setFooter({
			text: 'Membre banni',
		})
	}

	// Raison du bannissement
	const reason = bannedUser.reason ?? fetchedLog?.reason
	if (reason) {
		const escapedContent = reason.replace(/```/g, '\\`\\`\\`')
		const contentCut =
			escapedContent.length > 4000 ? `${escapedContent.slice(0, 4000)} [...]` : escapedContent

		logEmbed.setDescription(`\`\`\`\n${contentCut}\n\`\`\``)
	}

	return logsChannel.send({ embeds: [logEmbed] })
}
