import { isImage, getFileInfos, displayNameAndID, convertDateForDiscord } from '../../util/util.js'
import { MessageAttachment, Util, GuildAuditLogs } from 'discord.js'
import bent from 'bent'

const getLinkBuffer = url => {
	const getBuffer = bent('buffer')
	return getBuffer(url)
}

export default async (message, client) => {
	if (
		message.partial ||
		message.author.bot ||
		!message.guild ||
		message.guild.id !== client.config.guild.guildID ||
		client.cache.deleteMessagesID.has(message.id)
	)
		return

	// Acquisition du salon pour les logs
	const logsChannel = message.guild.channels.cache.get(
		client.config.guild.channels.logsMessagesChannelID,
	)
	if (!logsChannel) return

	// Vérification si le salon du message
	// est dans la liste des salons à ne pas logger
	if (client.config.guild.managers.noLogsManagerChannelIDs.includes(message.channel.id)) return

	// Fetch du message supprimé
	const fetchedLog = (
		await message.guild
			.fetchAuditLogs({
				type: GuildAuditLogs.Actions.MESSAGE_DELETE,
				limit: 1,
			})
			.catch(() => false)
	).entries.first()
	if (!fetchedLog) return

	// On vérifie si le message contient un thread
	if (message.hasThread) {
		const thread = await message.thread.fetch()
		// S'il n'est pas archivé
		if (!thread.archived)
			if (thread.messageCount > 1)
				// On archive s'il contient des messages
				thread.setArchived(true)
			// Sinon on supprime
			else thread.delete()
	}

	const logEmbed = {
		author: {
			name: `${displayNameAndID(message.member, message.author)}`,
			icon_url: message.author.displayAvatarURL({ dynamic: true }),
		},
		fields: [
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
		],
		timestamp: new Date(),
	}

	const { executor, target, extra } = fetchedLog

	// Détermination si le message a été supprimé par
	// celui qui l'a posté ou par un modérateur
	if (
		extra.channel.id === message.channel.id &&
		target.id === message.author.id &&
		fetchedLog.createdTimestamp > Date.now() - 5000 &&
		extra.count >= 1
	) {
		logEmbed.color = 'fc3c3c'
		logEmbed.footer = {
			icon_url: executor.displayAvatarURL({ dynamic: true }),
			text: `Message supprimé par ${executor.tag}`,
		}
	} else {
		logEmbed.color = '00FF00'
		logEmbed.footer = {
			text: "Message supprimé par l'auteur du message",
		}
	}

	// Partie contenu écrit du message
	if (message.content) {
		const escapedcontent = Util.escapeCodeBlock(message.content)
		logEmbed.description = `\`\`\`\n${escapedcontent}\`\`\``
	}

	// Partie attachments (fichiers, images, etc.)
	const attachments = message.attachments
	if (attachments.size <= 0) return logsChannel.send({ embeds: [logEmbed] })

	// Séparation des images et des autres fichiers
	const [imageAttachments, otherAttachments] = attachments.partition(attachment =>
		isImage(attachment.name),
	)

	// Partie image
	// Étant donné que les données sont supprimées de Discord
	// avant de recevoir l'event, il est possible de récupérer
	// les images via les proxy car elles restent disponibles quelques
	// temps après la suppression du message
	if (imageAttachments.size === 1) {
		const image = imageAttachments.first()
		logEmbed.image = {
			url: `attachment://${image.name}`,
		}
	}

	// Fetch en parallèle pour éviter une boucle for of asynchrone
	// qui induirait un temps plus long
	// cf : https://www.samjarman.co.nz/blog/promisedotall
	const messageAttachments = []
	await Promise.all(
		imageAttachments.map(async attachment => {
			const buffer = await getLinkBuffer(attachment.proxyURL).catch(() => null)
			if (!buffer) {
				const { name, type } = getFileInfos(attachment.name)
				return logEmbed.fields.push({
					name: `Fichier ${type}`,
					value: name,
					inline: true,
				})
			}

			return messageAttachments.push(new MessageAttachment(buffer, attachment.name))
		}),
	)

	// Partie fichiers
	// Étant donné que les données sont supprimées de Discord
	// avant de recevoir l'event, il est impossible de récupérer
	// les données pour pouvoir les logs
	// TODO : trouver une solution
	for (const [, attachment] of otherAttachments) {
		const { name, type } = getFileInfos(attachment.name)
		return logEmbed.fields.push({
			name: `Fichier ${type}`,
			value: name,
			inline: true,
		})
	}

	return logsChannel.send({ files: messageAttachments, embeds: [logEmbed] })
}
