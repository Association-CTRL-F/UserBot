/* eslint-disable max-len */
import {
	Collection,
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
	PermissionsBitField,
} from 'discord.js'
import {
	modifyWrongUsernames,
	convertDate,
	isImage,
	getFileInfos,
	displayNameAndID,
} from '../../util/util.js'
import { setTimeout as delay } from 'node:timers/promises'
import { ChatGPTAPI, ChatGPTError } from 'chatgpt'

export default async (message, client) => {
	if (message.author.bot) return

	if (message.partial) await message.fetch()

	// Anti-spam : 3 messages identiques d'affilée = ban auto
	if (message.guild && message.content?.trim()) {
		if (!client.lastMessages) client.lastMessages = new Collection()

		const userKey = `${message.guild.id}-${message.author.id}`

		const normalizedContent = message.content
			.trim()
			.toLowerCase()
			.replace(/\s+/g, ' ')

		const history = client.lastMessages.get(userKey) || []

		history.push(normalizedContent)

		// On garde seulement les 3 derniers messages
		if (history.length > 3) history.shift()

		client.lastMessages.set(userKey, history)

		// Si les 3 derniers messages sont identiques
		if (
			history.length === 3 &&
			history[0] === history[1] &&
			history[1] === history[2]
		) {
			try {
				// On évite de retrigger
				client.lastMessages.delete(userKey)

				// Vérifie que le membre peut être banni
				if (message.member?.bannable) {
					await message.guild.members.ban(message.author.id, {
						deleteMessageSeconds: banMessagesDays * 86400,
						reason: 'Auto-ban : 3 messages identiques consécutifs',
					})

					console.log(
						`[AUTO-BAN] ${message.author.tag} banni pour spam répété.`,
					)
					return
				}

				console.log(
					`[AUTO-BAN] Impossible de bannir ${message.author.tag} (permissions / rôle trop haut).`,
				)
			} catch (error) {
				console.error('Erreur auto-ban spam :', error)
			}
		}

		// Nettoyage mémoire au bout de 10 minutes
		globalThis.setTimeout(() => {
			const current = client.lastMessages.get(userKey)
			if (current === history) client.lastMessages.delete(userKey)
		}, 10 * 60 * 1000)
	}

	// Si le message vient d'une guild, on vérifie
	if (message.member) {
		// Si le pseudo respecte bien les règles
		modifyWrongUsernames(message.member).catch(() => null)

		if (
			client.config.guild.channels.BLABLA_CHANNEL_ID &&
			client.config.guild.roles.JOIN_ROLE_ID
		)
			if (
				message.channel.id !== client.config.guild.channels.BLABLA_CHANNEL_ID &&
				message.member.roles.cache.has(client.config.guild.roles.JOIN_ROLE_ID)
			)
				// Si c'est un salon autre que blabla
				message.member.roles.remove(client.config.guild.roles.JOIN_ROLE_ID).catch(error => {
					if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
				})
	}

	// Si c'est un salon no-text
	const NOTEXT = client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (NOTEXT.includes(message.channel.id) && message.attachments.size < 1) {
		const sentMessage = await message.channel.send(
			`<@${message.author.id}>, tu dois mettre une image / vidéo 😕`,
		)
		return Promise.all([
			await message.delete().catch(() => false),
			setTimeout(
				() =>
					sentMessage.delete().catch(error => {
						if (error.code !== RESTJSONErrorCodes.UnknownMessage) console.error(error)
					}),
				// Suppression après 7 secondes
				7 * 1000,
			),
		])
	}

	// Si c'est un salon auto-thread
	const THREADS = client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (THREADS.includes(message.channel.id)) {
		await message.react('⬆️')
		await message.react('⬇️')
		await message.react('💬')
	}

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Alertes personnalisées
	let alerts = []
	try {
		const sql = 'SELECT * FROM alerts'
		const [result] = await bdd.execute(sql)
		alerts = result
	} catch (error) {
		return console.error(error)
	}

	alerts.forEach(alert => {
		const hay = message.content.normalize('NFD').replace(/\p{M}/gu, '')
		const needle = alert.text
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${needle}(?=$|[^\\p{L}\\p{N}_])`, 'iu')

		if (re.test(message.content)) {
			// Acquisition du membre
			const member = message.guild.members.cache.get(alert.discordID)

			// Si c'est son propre message on envoi pas d'alerte
			if (message.author.id === alert.discordID) return

			// Vérification si le membre à accès au salon
			// dans lequel le message a été envoyé
			const permissionsMember = member.permissionsIn(message.channel)
			if (!permissionsMember.has(PermissionsBitField.Flags.ViewChannel)) return

			// Cut + escape message content
			let textCut = ''
			let alertTextCut = ''

			if (message.content.length < 200) textCut = `${message.content.substr(0, 200)}`
			else textCut = `${message.content.substr(0, 200)} [...]`

			if (alert.text.length < 200) alertTextCut = `${alert.text.substr(0, 200)}`
			else alertTextCut = `${alert.text.substr(0, 200)} [...]`

			const escapedcontentText = textCut.replace(/```/g, '\\`\\`\\`')
			const escapedcontentAlertText = alertTextCut.replace(/```/g, '\\`\\`\\`')

			// Envoi du message d'alerte en message privé
			const embedAlert = new EmbedBuilder()
				.setColor('#C27C0E')
				.setTitle('Alerte message')
				.setDescription('Un message envoyé correspond à votre alerte.')
				.setAuthor({
					name: message.guild.name,
					iconURL: message.guild.iconURL({ dynamic: true }),
					url: message.guild.vanityURL,
				})
				.addFields([
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
				])

			const buttonMessage = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel('Aller au message')
					.setStyle(ButtonStyle.Link)
					.setURL(
						`https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
					),
			)

			const DMMessage = member
				.send({
					embeds: [embedAlert],
					components: [buttonMessage],
				})
				.catch(error => {
					if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) throw error
					return console.error(error)
				})

			// Si au moins une erreur, throw
			if (DMMessage instanceof Error)
				throw new Error(
					"L'envoi d'un message a échoué. Voir les logs précédents pour plus d'informations.",
				)
		}
	})

	// Command handler
	if (message.content.startsWith(client.config.guild.COMMANDS_PREFIX)) {
		const regexCommands = `^${client.config.guild.COMMANDS_PREFIX}{${client.config.guild.COMMANDS_PREFIX.length}}([a-zA-Z0-9]+)(?: .*|$)`

		const args = message.content.match(regexCommands)
		if (!args) return

		const commandName = args[1].toLowerCase()
		if (!commandName) return

		// Vérification si la commande existe et est activée
		let command = ''
		try {
			const sql = 'SELECT * FROM commands WHERE name = ? OR aliases REGEXP ?'
			const data = [commandName, `(?:^|,)(${commandName})(?:,|$)`]
			const [result] = await bdd.execute(sql, data)

			command = result[0]
		} catch (error) {
			console.error(error)
			message.reply({ content: 'Il y a eu une erreur en exécutant la commande 😬' })
		}

		if (!command) return

		if (!command.active) return

		// Partie cooldown
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

				return client.cache.deleteMessagesID.add(sentMessage.id)
			}
		}

		timestamps.set(message.author.id, now)
		globalThis.setTimeout(() => { timestamps.delete(message.author.id) }, cooldownAmount)

		// Si configuré, on prépare un embed avec un bouton de redirection
		let button = []
		if (command.textLinkButton !== null && command.linkButton !== null)
			button = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel(command.textLinkButton)
					.setURL(command.linkButton)
					.setStyle(ButtonStyle.Link),
			)

		// Exécution de la commande
		try {
			const sql = 'UPDATE commands SET numberOfUses = numberOfUses + 1 WHERE name = ?'
			const data = [commandName]
			await bdd.execute(sql, data)

			if (button.length === 0)
				return message.channel.send({
					content: command.content,
				})

			return message.channel.send({
				content: command.content,
				components: [button],
			})
		} catch (error) {
			message.reply({ content: 'Il y a eu une erreur en exécutant la commande 😬' })
		}
	}

	// Partie citation
	if (message.guild) {
		// Répondre aux messages avec mention en utilisant ChatGPT
		// Répondre émoji si @bot
		if (message.mentions.users.has(client.user.id) && !message.mentions.repliedUser) {
			if (client.config.others.openAiKey !== '') {
				const chatgpt = new ChatGPTAPI({
					apiKey: client.config.others.openAiKey,
					completionParams: {
						model: 'gpt-5',
					},
				})

				try {
					const chatgptResponse = await chatgpt.sendMessage(message.content)
					if (
						chatgptResponse.text.includes('@everyone') ||
						chatgptResponse.text.includes('@here')
					)
						return message.reply({
							content: `Désolé, je ne peux pas mentionner ${message.guild.memberCount} personnes 😬`,
						})

					if (chatgptResponse.text.length > 1960)
						return message.reply({
							content: `**[Réponse partielle]**\n\n${chatgptResponse.text.substr(
								0,
								1960,
							)} [...]`,
						})

					return message.reply({ content: chatgptResponse.text })
				} catch (error) {
					console.error(error)

					return message.reply({ content: 'Une erreur est survenue 😬' })
				}
			}
		}

		// Regex pour match les liens Discord
		const regexGlobal =
			/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/g
		const regex =
			/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/

		// Suppression des lignes en citations, pour ne pas afficher la citation
		const matches = message.content.match(regexGlobal)
		if (!matches) return

		const validMessages = (
			await Promise.all(
				// Filtre les liens mennant vers une autre guild
				// ou sur un salon n'existant pas sur la guild
				matches
					.reduce((acc, match) => {
						const [, guildId, channelId, messageId] = regex.exec(match)
						if (guildId !== message.guild.id) return acc

						const foundChannel = message.guild.channels.cache.get(channelId)
						if (!foundChannel) return acc

						// Ignore la citation si le lien est entouré de <>
						if (match.startsWith('<') && match.endsWith('>')) return acc

						acc.push({ messageId, foundChannel })

						return acc
					}, [])
					// Fetch du message et retourne de celui-ci s'il existe
					.map(async ({ messageId, foundChannel }) => {
						const foundMessage = await foundChannel.messages
							.fetch(messageId)
							.catch(() => null)
						// On ne fait pas la citation si le
						// message n'a ni contenu écrit ni attachments
						if (
							!foundMessage ||
							(!foundMessage.content && !foundMessage.attachments.size)
						)
							return

						return foundMessage
					}),
			)
		)
			// Suppression des messages invalides
			.filter(Boolean)

		const sentMessages = validMessages.map(validMessage => {
			const embed = new EmbedBuilder()
				.setColor('2F3136')
				.setAuthor({
					name: `${displayNameAndID(validMessage.member, validMessage.author)}`,
					iconURL: validMessage.author.displayAvatarURL({ dynamic: true }),
				})
				.setFooter({
					text: `Message posté le ${convertDate(validMessage.createdAt)}`,
				})

			const description = `${validMessage.content}\n[Aller au message](${validMessage.url}) - ${validMessage.channel}`

			// Si la description dépasse la limite
			// autorisée, les liens sont contenus dans des fields
			if (description.length > 4096) {
				embed.data.description = validMessage.content
				embed.addFields([
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
				])
			} else {
				embed.data.description = description
			}

			if (validMessage.editedAt)
				embed.data.footer.text += `\nModifié le ${convertDate(validMessage.editedAt)}`

			if (message.author !== validMessage.author) {
				embed.data.footer.icon_url = message.author.displayAvatarURL({ dynamic: true })
				embed.data.footer.text += `\nCité par ${displayNameAndID(
					message.member,
					message.author,
				)} le ${convertDate(message.createdAt)}`
			}

			// Partie pour gérer les attachments
			const attachments = validMessage.attachments
			if (attachments.size === 1 && isImage(attachments.first().name))
				embed.data.image = { url: attachments.first().url }
			else
				attachments.forEach(attachment => {
					const { name, type } = getFileInfos(attachment.name)
					embed.addFields([
						{
							name: `Fichier ${type}`,
							value: `[${name}](${attachment.url})`,
							inline: true,
						},
					])
				})

			return message.channel.send({ embeds: [embed] })
		})

		// Si le message ne contient que un(des) lien(s),
		// on supprime le message, ne laissant que les embeds
		if (
			!message.content.replace(regexGlobal, '').trim() &&
			sentMessages.length === matches.length &&
			!message.mentions.repliedUser
		) {
			client.cache.deleteMessagesID.add(message.id)
			return message.delete()
		}
	}
}
