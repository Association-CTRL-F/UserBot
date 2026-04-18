import { isImage, getFileInfos, displayNameAndID, convertDateForDiscord } from '../../util/util.js'
import { AttachmentBuilder, AuditLogEvent, EmbedBuilder, PermissionFlagsBits } from 'discord.js'
import bent from 'bent'

const getLinkBuffer = (url) => {
	const getBuffer = bent('buffer')
	return getBuffer(url)
}

export default async (message, client) => {
	if (
		message.partial ||
		message.author.bot ||
		!message.guild ||
		client.cache.deleteMessagesID.has(message.id)
	) {
		return
	}

	// Acquisition du salon de logs
	const logsChannel = message.guild.channels.cache.get(
		client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
	)
	if (!logsChannel) return

	// Vérification si le salon du message
	// est dans la liste des salons à ne pas logger
	const NOLOGS = client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (NOLOGS.includes(message.channel.id)) return

	// Récupération éventuelle du log d'audit
	// Il n'existe pas toujours :
	// - si l'auteur supprime son propre message
	// - si le log n'est pas encore dispo
	// - si le bot n'a pas la permission ViewAuditLog
	let fetchedLog = null
	const me = message.guild.members.me

	if (me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
		// Petit délai pour laisser le temps au log d'apparaître
		await new Promise((resolve) => globalThis.setTimeout(resolve, 1200))

		const auditLogs = await message.guild
			.fetchAuditLogs({
				type: AuditLogEvent.MessageDelete,
				limit: 6,
			})
			.catch(() => null)

		if (auditLogs) {
			fetchedLog =
				auditLogs.entries.find((entry) => {
					const sameTarget = entry.target?.id === message.author?.id
					const sameChannel = entry.extra?.channel?.id === message.channel?.id
					const recentEnough = Date.now() - entry.createdTimestamp < 10_000

					return sameTarget && sameChannel && recentEnough
				}) ?? null
		}
	}

	// On vérifie si le message contient un thread
	if (message.hasThread && message.thread) {
		const thread = await message.thread.fetch().catch(() => null)

		if (thread && !thread.archived) {
			if (thread.messageCount > 1) {
				await thread.setArchived(true).catch(() => null)
			} else {
				await thread.delete().catch(() => null)
			}
		}
	}

	// Création de l'embed
	const logEmbed = new EmbedBuilder()
		.setColor(0x57c92a)
		.setAuthor({
			name: displayNameAndID(message.member, message.author),
			iconURL: message.author.displayAvatarURL({ dynamic: true }),
		})
		.addFields(
			{
				name: 'Auteur',
				value: message.author.toString(),
				inline: true,
			},
			{
				name: 'Salon',
				value: message.channel.toString(),
				inline: true,
			},
			{
				name: 'Posté le',
				value: convertDateForDiscord(message.createdAt),
				inline: true,
			},
		)
		.setTimestamp(new Date())

	// Détermination si le message a été supprimé par un modérateur
	// ou par l'auteur du message
	if (fetchedLog?.executor && fetchedLog?.target && fetchedLog?.extra?.channel) {
		logEmbed.setColor(0xfc5c5c).setFooter({
			iconURL: fetchedLog.executor.displayAvatarURL({ dynamic: true }),
			text: `Message supprimé par ${fetchedLog.executor.tag}`,
		})
	} else {
		logEmbed.setColor(0x00ff00).setFooter({
			text: "Message supprimé par l'auteur du message",
		})
	}

	// Partie contenu écrit du message
	if (message.content) {
		const escapedContent = message.content.replace(/```/g, '\\`\\`\\`')
		const contentCut =
			escapedContent.length > 4000 ? `${escapedContent.slice(0, 4000)} [...]` : escapedContent

		logEmbed.setDescription(`\`\`\`\n${contentCut}\n\`\`\``)
	}

	// Partie attachments (fichiers, images, etc.)
	const attachments = message.attachments
	if (attachments.size <= 0) {
		return logsChannel.send({ embeds: [logEmbed] })
	}

	// Séparation des images et des autres fichiers
	const [imageAttachments, otherAttachments] = attachments.partition((attachment) =>
		isImage(attachment.name),
	)

	// Partie image
	// Les proxyURL restent parfois accessibles un court moment
	// après la suppression du message
	if (imageAttachments.size === 1) {
		const image = imageAttachments.first()
		logEmbed.setImage(`attachment://${image.name}`)
	}

	// Fetch en parallèle pour éviter une boucle asynchrone lente
	const messageAttachments = []

	await Promise.all(
		imageAttachments.map(async (attachment) => {
			const buffer = await getLinkBuffer(attachment.proxyURL).catch(() => null)

			if (!buffer) {
				const { name, type } = getFileInfos(attachment.name)
				logEmbed.addFields({
					name: `Fichier ${type}`,
					value: name,
					inline: true,
				})
				return
			}

			messageAttachments.push(
				new AttachmentBuilder(buffer, {
					name: attachment.name,
				}),
			)
		}),
	)

	// Partie autres fichiers
	for (const [, attachment] of otherAttachments) {
		const { name, type } = getFileInfos(attachment.name)
		logEmbed.addFields({
			name: `Fichier ${type}`,
			value: name,
			inline: true,
		})
	}

	return logsChannel.send({
		files: messageAttachments,
		embeds: [logEmbed],
	})
}
