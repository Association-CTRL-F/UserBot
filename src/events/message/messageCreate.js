import {
	Collection,
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
	PermissionsBitField,
	AttachmentBuilder,
} from 'discord.js'
import {
	modifyWrongUsernames,
	convertDate,
	isImage,
	getFileInfos,
	displayNameAndID,
} from '../../util/util.js'
import { ChatGPTAPI } from 'chatgpt'
import bent from 'bent'

const SPAM_WINDOW_MS = 10 * 60 * 1000
const SPAM_MIN_MESSAGES = 3
const SPAM_MIN_CHANNELS = 3
const SPAM_TRACK_LIMIT = 25
const SPAM_TIMEOUT_MS = 12 * 60 * 60 * 1000

const getLinkBuffer = (url) => {
	const getBuffer = bent('buffer')
	return getBuffer(url)
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const truncateText = (value, max = 1000) => {
	if (!value || !value.trim()) return '[Aucun contenu texte]'

	const escaped = value.replace(/```/g, '\\`\\`\\`')
	if (escaped.length <= max) return escaped

	return `${escaped.slice(0, max - 6)} [...]`
}

const normalizeSpamContent = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ')

const getAttachmentSignature = (attachments) =>
	[...attachments.values()]
		.map(
			(attachment) =>
				`${attachment.name ?? 'fichier'}:${attachment.size ?? 0}:${
					attachment.contentType ?? 'unknown'
				}`,
		)
		.sort()
		.join('|')

const normalizeSpamPayload = (message) => {
	const normalizedText = message.content?.trim() ? normalizeSpamContent(message.content) : ''
	const attachmentSignature = getAttachmentSignature(message.attachments)

	if (normalizedText && attachmentSignature) {
		return `${normalizedText}|||${attachmentSignature}`
	}

	return normalizedText || attachmentSignature
}

const getSpamImmuneRoleIds = (client) =>
	[
		client.config.guild.roles.STAFF_EDITEURS_ROLE_ID,
		client.config.guild.roles.MODO_ROLE_ID,
		client.config.guild.roles.CERTIF_ROLE_ID,
	]
		.filter(Boolean)
		.map(String)

const isSpamImmune = (member, client) => {
	if (!member) return true

	const immuneRoleIds = getSpamImmuneRoleIds(client)

	if (
		member.permissions.has(PermissionsBitField.Flags.Administrator) ||
		member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ManageMessages)
	) {
		return true
	}

	return member.roles.cache.some((role) => immuneRoleIds.includes(role.id))
}

const buildSpamActionRow = (reportId) =>
	new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`spam-action:ban:${reportId}`)
			.setLabel('Ban')
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId(`spam-action:lift:${reportId}`)
			.setLabel('Retirer la sanction')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId(`spam-action:keep:${reportId}`)
			.setLabel('Conserver la sanction')
			.setStyle(ButtonStyle.Secondary),
	)

const applySpamSanction = async (member, client) => {
	if (!member) {
		return {
			ok: false,
			type: 'none',
			label: 'Aucune',
			error: 'Membre introuvable',
		}
	}

	if (member.moderatable) {
		try {
			await member.timeout(
				SPAM_TIMEOUT_MS,
				'Spam cross-salons détecté automatiquement par le bot',
			)

			return {
				ok: true,
				type: 'timeout',
				label: 'Timeout 12 heures',
			}
		} catch (error) {
			console.error(error)
		}
	}

	const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID
	if (mutedRoleId && member.manageable && !member.roles.cache.has(mutedRoleId)) {
		try {
			await member.roles.add(
				mutedRoleId,
				'Spam cross-salons détecté automatiquement par le bot',
			)

			return {
				ok: true,
				type: 'mute_role',
				label: 'Rôle Muted',
			}
		} catch (error) {
			console.error(error)
		}
	}

	return {
		ok: false,
		type: 'none',
		label: 'Aucune',
		error: 'Impossible de timeout ni de mute ce membre',
	}
}

const buildSpamReportAssets = async (entries) => {
	let embedImageFile = null
	const attachmentLabels = []
	let attachmentIndex = 0

	for (const entry of entries) {
		for (const attachment of entry.message.attachments.values()) {
			attachmentIndex += 1

			const originalName = attachment.name ?? `fichier-${attachmentIndex}`
			attachmentLabels.push(`• ${originalName} — <#${entry.channelId}>`)

			if (embedImageFile || !isImage(originalName)) continue

			const uniqueName = `${entry.messageId}-${attachmentIndex}-${originalName}`

			const buffer = await getLinkBuffer(attachment.proxyURL ?? attachment.url).catch(
				() => null,
			)

			if (!buffer) continue

			embedImageFile = new AttachmentBuilder(buffer, {
				name: uniqueName,
			})
		}
	}

	return {
		embedImageFile,
		attachmentLabels,
	}
}

const parsePrefixedCommand = (messageContent, prefix) => {
	if (!messageContent.startsWith(prefix)) return null

	const escapedPrefix = escapeRegex(prefix)
	const regexCommands = new RegExp(`^${escapedPrefix}([a-zA-Z0-9]+)(?:\\s+(.*))?$`)
	const match = messageContent.match(regexCommands)

	if (!match) return null

	return {
		name: match[1].toLowerCase(),
		argsRaw: match[2] ?? '',
	}
}

const handleCustomCommand = async (message, client, bdd, parsedCommand) => {
	let command = null

	try {
		const sql = 'SELECT * FROM commands WHERE name = ? OR aliases REGEXP ?'
		const data = [parsedCommand.name, `(?:^|,)(${parsedCommand.name})(?:,|$)`]
		const [result] = await bdd.execute(sql, data)
		command = result[0] ?? null
	} catch (error) {
		console.error(error)
		await message.reply({ content: 'Il y a eu une erreur en exécutant la commande 😬' })
		return true
	}

	if (!command || !command.active) {
		return true
	}

	if (!client.cooldowns.has(command.name)) {
		client.cooldowns.set(command.name, new Collection())
	}

	const now = Date.now()
	const timestamps = client.cooldowns.get(command.name)
	const cooldownAmount = (command.cooldown || 4) * 1000

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount

		if (now < expirationTime) {
			const timeLeft = expirationTime - now
			const sentMessage = await message.reply({
				content: `Merci d'attendre ${(timeLeft / 1000).toFixed(
					1,
				)} seconde(s) de plus avant de réutiliser la commande **${command.name}** 😬`,
			})

			client.cache.deleteMessagesID.add(sentMessage.id)
			return true
		}
	}

	timestamps.set(message.author.id, now)
	globalThis.setTimeout(() => {
		timestamps.delete(message.author.id)
	}, cooldownAmount)

	let button = null
	if (command.textLinkButton && command.linkButton) {
		button = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel(command.textLinkButton)
				.setURL(command.linkButton)
				.setStyle(ButtonStyle.Link),
		)
	}

	try {
		const sql = 'UPDATE commands SET numberOfUses = numberOfUses + 1 WHERE name = ?'
		const data = [command.name]
		await bdd.execute(sql, data)

		if (!button) {
			await message.channel.send({
				content: command.content,
			})
			return true
		}

		await message.channel.send({
			content: command.content,
			components: [button],
		})
		return true
	} catch (error) {
		console.error(error)
		await message.reply({ content: 'Il y a eu une erreur en exécutant la commande 😬' })
		return true
	}
}

const handleCrossChannelSpam = async (message, client) => {
	if (!message.guild || !message.member) return false

	const hasText = Boolean(message.content?.trim())
	const hasAttachments = message.attachments.size > 0

	if (!hasText && !hasAttachments) return false
	if (isSpamImmune(message.member, client)) return false

	const bdd = client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return false
	}

	const spamCache = client.cache.crossChannelSpam
	const userKey = `${message.guild.id}-${message.author.id}`
	const now = message.createdTimestamp
	const normalizedPayload = normalizeSpamPayload(message)

	const history = spamCache.get(userKey) || []
	const nextHistory = history
		.filter((entry) => now - entry.createdTimestamp <= SPAM_WINDOW_MS)
		.concat({
			messageId: message.id,
			channelId: message.channel.id,
			createdTimestamp: now,
			payload: normalizedPayload,
			message,
		})
		.slice(-SPAM_TRACK_LIMIT)

	spamCache.set(userKey, nextHistory)

	const identicalEntries = nextHistory.filter(
		(entry) =>
			entry.payload === normalizedPayload && now - entry.createdTimestamp <= SPAM_WINDOW_MS,
	)

	const distinctChannels = new Set(identicalEntries.map((entry) => entry.channelId))

	if (identicalEntries.length < SPAM_MIN_MESSAGES || distinctChannels.size < SPAM_MIN_CHANNELS) {
		return false
	}

	spamCache.set(
		userKey,
		nextHistory.filter((entry) => entry.payload !== normalizedPayload),
	)

	const { embedImageFile, attachmentLabels } = await buildSpamReportAssets(identicalEntries)

	const deletedMessages = []
	for (const entry of identicalEntries) {
		client.cache.deleteMessagesID.add(entry.messageId)

		const deleted = await entry.message
			.delete()
			.then(() => true)
			.catch(() => false)

		if (deleted) {
			deletedMessages.push(entry)
		}
	}

	const sanction = await applySpamSanction(message.member, client)

	const reportChannel = message.guild.channels.cache.get(
		client.config.guild.channels.REPORT_CHANNEL_ID,
	)

	if (!reportChannel?.isTextBased()) {
		return true
	}

	const channelsList = [...distinctChannels].map((channelId) => `<#${channelId}>`).join(', ')
	const preview = truncateText(message.content ?? '', 1500)
	const reportId = `${message.author.id}-${Date.now()}`

	const reportEmbed = new EmbedBuilder()
		.setColor('#FF3200')
		.setTitle('Spam cross-salons détecté')
		.setAuthor({
			name: displayNameAndID(message.member, message.author),
			iconURL: message.author.displayAvatarURL({ dynamic: true }),
		})
		.setDescription(`\`\`\`\n${preview}\n\`\`\``)
		.addFields(
			{
				name: 'Utilisateur',
				value: `${message.author} (ID : ${message.author.id})`,
				inline: true,
			},
			{
				name: 'Messages supprimés',
				value: String(deletedMessages.length),
				inline: true,
			},
			{
				name: 'Salons concernés',
				value: channelsList,
				inline: false,
			},
			{
				name: 'Sanction automatique',
				value: sanction.ok ? sanction.label : `Échec : ${sanction.error}`,
				inline: false,
			},
			{
				name: 'Critère',
				value: '3 messages identiques dans 3 salons différents en moins de 10 minutes',
				inline: false,
			},
		)
		.setFooter({
			text: 'Choisissez une action ci-dessous',
		})
		.setTimestamp(new Date())

	if (attachmentLabels.length) {
		const attachmentValue = attachmentLabels.join('\n')
		reportEmbed.addFields({
			name: 'Pièces jointes',
			value:
				attachmentValue.length > 1024
					? `${attachmentValue.slice(0, 1020)} ...`
					: attachmentValue,
			inline: false,
		})
	}

	if (embedImageFile) {
		reportEmbed.setImage(`attachment://${embedImageFile.name}`)
	}

	const reportMessage = await reportChannel.send({
		embeds: [reportEmbed],
		components: [buildSpamActionRow(reportId)],
		files: embedImageFile ? [embedImageFile] : [],
	})

	try {
		const sql =
			'INSERT INTO spam_reports (report_id, guild_id, user_id, report_message_id, sanction_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
		const data = [
			reportId,
			message.guild.id,
			message.author.id,
			reportMessage.id,
			sanction.type,
			'pending',
			Math.round(Date.now() / 1000),
		]
		await bdd.execute(sql, data)
	} catch (error) {
		console.error(error)
	}

	return true
}

export default async (message, client) => {
	if (message.author.bot) return

	if (message.partial) {
		await message.fetch().catch(() => null)
		if (message.partial) return
	}

	if (!message.guild) return

	const messageContent = message.content ?? ''
	const parsedCommand = parsePrefixedCommand(messageContent, client.config.guild.COMMANDS_PREFIX)

	// Anti-spam cross-salons
	const spamHandled = await handleCrossChannelSpam(message, client)
	if (spamHandled) return

	// Si le message vient d'une guild, on vérifie
	if (message.member) {
		modifyWrongUsernames(message.member).catch(() => null)

		if (
			client.config.guild.channels.BLABLA_CHANNEL_ID &&
			client.config.guild.roles.JOIN_ROLE_ID &&
			message.channel.id !== client.config.guild.channels.BLABLA_CHANNEL_ID &&
			message.member.roles.cache.has(client.config.guild.roles.JOIN_ROLE_ID)
		) {
			message.member.roles.remove(client.config.guild.roles.JOIN_ROLE_ID).catch((error) => {
				if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
			})
		}
	}

	// Si c'est un salon no-text
	const NOTEXT = client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (NOTEXT.includes(message.channel.id) && message.attachments.size < 1) {
		const sentMessage = await message.channel.send(
			`<@${message.author.id}>, tu dois mettre une image / vidéo 😕`,
		)

		await message.delete().catch(() => false)

		globalThis.setTimeout(() => {
			sentMessage.delete().catch((error) => {
				if (error.code !== RESTJSONErrorCodes.UnknownMessage) console.error(error)
			})
		}, 7 * 1000)

		return
	}

	// Si c'est un salon auto-thread
	const THREADS = client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (THREADS.includes(message.channel.id)) {
		await Promise.all([
			message.react('⬆️').catch(() => null),
			message.react('⬇️').catch(() => null),
			message.react('💬').catch(() => null),
		])
	}

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return
	}

	// Command handler
	if (parsedCommand) {
		const handled = await handleCustomCommand(message, client, bdd, parsedCommand)
		if (handled) return
	}

	// Alertes personnalisées
	let alerts = []
	try {
		const sql = 'SELECT * FROM alerts'
		const [result] = await bdd.execute(sql)
		alerts = result
	} catch (error) {
		console.error(error)
		return
	}

	const hay = messageContent.normalize('NFD').replace(/\p{M}/gu, '')

	for (const alert of alerts) {
		const needle = alert.text
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

		const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${needle}(?=$|[^\\p{L}\\p{N}_])`, 'iu')
		if (!re.test(hay)) continue

		const member = await message.guild.members.fetch(alert.discordID).catch(() => null)
		if (!member) continue

		if (message.author.id === alert.discordID) continue

		const permissionsMember = member.permissionsIn(message.channel)
		if (!permissionsMember.has(PermissionsBitField.Flags.ViewChannel)) continue

		const textCut =
			messageContent.length < 200
				? messageContent.slice(0, 200)
				: `${messageContent.slice(0, 200)} [...]`

		const alertTextCut =
			alert.text.length < 200 ? alert.text.slice(0, 200) : `${alert.text.slice(0, 200)} [...]`

		const escapedcontentText = textCut.replace(/```/g, '\\`\\`\\`')
		const escapedcontentAlertText = alertTextCut.replace(/```/g, '\\`\\`\\`')

		const embedAlert = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Alerte message')
			.setDescription('Un message envoyé correspond à votre alerte.')
			.setAuthor({
				name: message.guild.name,
				iconURL: message.guild.iconURL({ dynamic: true }),
				url: message.guild.vanityURL ?? undefined,
			})
			.addFields(
				{
					name: 'Alerte définie',
					value: `\`\`\`\n${escapedcontentAlertText}\`\`\``,
				},
				{
					name: 'Message envoyé',
					value: `\`\`\`\n${escapedcontentText}\`\`\``,
				},
				{
					name: 'Salon',
					value: message.channel.toString(),
					inline: true,
				},
				{
					name: 'Auteur',
					value: `${message.author.toString()} (ID : ${message.author.id})`,
					inline: true,
				},
			)

		const buttonMessage = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel('Aller au message')
				.setStyle(ButtonStyle.Link)
				.setURL(
					`https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
				),
		)

		await member
			.send({
				embeds: [embedAlert],
				components: [buttonMessage],
			})
			.catch((error) => {
				if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
					console.error(error)
				}
			})
	}

	// Mention bot
	if (message.mentions.users.has(client.user.id) && !message.mentions.repliedUser) {
		if (client.config.others.openAiKey !== '') {
			const chatgpt = new ChatGPTAPI({
				apiKey: client.config.others.openAiKey,
				completionParams: {
					model: 'gpt-5',
				},
			})

			try {
				const chatgptResponse = await chatgpt.sendMessage(messageContent)

				if (
					chatgptResponse.text.includes('@everyone') ||
					chatgptResponse.text.includes('@here')
				) {
					return message.reply({
						content: `Désolé, je ne peux pas mentionner ${message.guild.memberCount} personnes 😬`,
					})
				}

				if (chatgptResponse.text.length > 1960) {
					return message.reply({
						content: `**[Réponse partielle]**\n\n${chatgptResponse.text.slice(
							0,
							1960,
						)} [...]`,
					})
				}

				return message.reply({ content: chatgptResponse.text })
			} catch (error) {
				console.error(error)
				return message.reply({ content: 'Une erreur est survenue 😬' })
			}
		}
	}

	// Citations Discord
	const regexGlobal =
		/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/g
	const regex =
		/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/

	const matches = messageContent.match(regexGlobal)
	if (!matches) return

	const validMessages = (
		await Promise.all(
			matches
				.reduce((acc, match) => {
					const result = regex.exec(match)
					if (!result) return acc

					const [, guildId, channelId, messageId] = result
					if (guildId !== message.guild.id) return acc

					const foundChannel = message.guild.channels.cache.get(channelId)
					if (!foundChannel || typeof foundChannel.messages?.fetch !== 'function') {
						return acc
					}

					if (match.startsWith('<') && match.endsWith('>')) return acc

					acc.push({ messageId, foundChannel })
					return acc
				}, [])
				.map(async ({ messageId, foundChannel }) => {
					const foundMessage = await foundChannel.messages
						.fetch(messageId)
						.catch(() => null)

					if (
						!foundMessage ||
						(!foundMessage.content && !foundMessage.attachments.size)
					) {
						return null
					}

					return foundMessage
				}),
		)
	).filter(Boolean)

	const sentMessages = await Promise.all(
		validMessages.map(async (validMessage) => {
			const embed = new EmbedBuilder().setColor(0x2f3136).setAuthor({
				name: displayNameAndID(validMessage.member, validMessage.author),
				iconURL: validMessage.author.displayAvatarURL({ dynamic: true }),
			})

			const footerLines = [`Message posté le ${convertDate(validMessage.createdAt)}`]
			let footerIconURL

			const description = `${validMessage.content}\n[Aller au message](${validMessage.url}) - ${validMessage.channel}`

			if (description.length > 4096) {
				embed.setDescription(validMessage.content)
				embed.addFields(
					{
						name: 'Message',
						value: `[Aller au message](${validMessage.url})`,
						inline: true,
					},
					{
						name: 'Salon',
						value: validMessage.channel.toString(),
						inline: true,
					},
				)
			} else {
				embed.setDescription(description)
			}

			if (validMessage.editedAt) {
				footerLines.push(`Modifié le ${convertDate(validMessage.editedAt)}`)
			}

			if (message.author.id !== validMessage.author.id) {
				footerIconURL = message.author.displayAvatarURL({ dynamic: true })
				footerLines.push(
					`Cité par ${displayNameAndID(message.member, message.author)} le ${convertDate(
						message.createdAt,
					)}`,
				)
			}

			embed.setFooter({
				text: footerLines.join('\n'),
				iconURL: footerIconURL,
			})

			const attachments = validMessage.attachments
			if (attachments.size === 1 && isImage(attachments.first().name)) {
				embed.setImage(attachments.first().url)
			} else {
				attachments.forEach((attachment) => {
					const { name, type } = getFileInfos(attachment.name)
					embed.addFields({
						name: `Fichier ${type}`,
						value: `[${name}](${attachment.url})`,
						inline: true,
					})
				})
			}

			return message.channel.send({ embeds: [embed] }).catch(() => null)
		}),
	)

	const successfulSentMessages = sentMessages.filter(Boolean)

	if (
		!messageContent.replace(regexGlobal, '').trim() &&
		successfulSentMessages.length === matches.length &&
		!message.mentions.repliedUser
	) {
		client.cache.deleteMessagesID.add(message.id)
		return message.delete().catch(() => null)
	}
}
