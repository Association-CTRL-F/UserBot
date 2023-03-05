import {
	Collection,
	GuildMember,
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
	isStaffMember,
	convertDateForDiscord,
	diffDate,
	findLinks,
	getFinalLink,
	isLinkMalicious,
} from '../../util/util.js'
import { ChatGPTAPI } from 'chatgpt'

export default async (message, client) => {
	if (message.author.bot || !message.guild || !message.guild.available) return

	if (message.partial) await message.fetch()

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

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

	// Automod //

	// Acquisition du salon de logs liste-ban
	const logsChannel = message.guild.channels.cache.get(
		client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
	)
	if (!logsChannel) return

	// Partie domaines
	const staffRoles = client.config.guild.managers.STAFF_ROLES_MANAGER_IDS
		? client.config.guild.managers.STAFF_ROLES_MANAGER_IDS.split(/, */)
		: []

	if (!isStaffMember(message.member, staffRoles)) {
		const sentMessage = await message.fetch().catch(() => false)

		let guildMember = {}
		if (message.guild)
			guildMember = await message.guild.members.fetch(sentMessage.author).catch(() => false)

		if (!sentMessage || !guildMember) return

		const messageLinks = await findLinks(message.content)
		if (!messageLinks) return

		await messageLinks.forEach(async (link, domainName) => {
			const finalLink = await getFinalLink(client, bdd, link, domainName)
			const malicious = await isLinkMalicious(bdd, finalLink)

			// Si lien frauduleux, alors ban
			if (malicious) {
				// Suppression du message
				sentMessage.delete()

				// Acquisition du message de bannissement
				let banDM = ''
				try {
					const sql = 'SELECT * FROM forms WHERE name = ?'
					const data = ['ban']
					const [result] = await bdd.execute(sql, data)

					banDM = result[0].content
				} catch {
					return console.log(
						'Une erreur est survenue lors de la récupération du message de bannissement en base de données (Automod)',
					)
				}

				// Envoi du message de bannissement en message privé
				const embed = new EmbedBuilder()
					.setColor('#C27C0E')
					.setTitle('Bannissement')
					.setDescription(banDM)
					.setAuthor({
						name: sentMessage.guild.name,
						iconURL: sentMessage.guild.iconURL({ dynamic: true }),
						url: sentMessage.guild.vanityURL,
					})
					.addFields([
						{
							name: 'Raison du bannissement',
							value: 'Scam Nitro / Steam (Automod)',
						},
					])

				const DMMessageBan = await guildMember
					.send({
						embeds: [embed],
					})
					.catch(error => {
						console.error(error)
					})

				// Ban du membre
				const banAction = await guildMember
					.ban({
						deleteMessageSeconds: 604800,
						reason: `${client.user.tag} : Scam Nitro / Steam (Automod)`,
					})
					.catch(error => {
						// Suppression du message privé envoyé
						// car action de bannissement non réalisée
						if (DMMessageBan) DMMessageBan.delete()

						if (error.code === RESTJSONErrorCodes.MissingPermissions)
							return console.log(
								"Je n'ai pas les permissions pour bannir ce membre (Automod)",
							)

						console.error(error)
						return console.log(
							'Une erreur est survenue lors du bannissement du membre (Automod)',
						)
					})

				// Si pas d'erreur, envoi du message log dans le salon
				if (banAction instanceof GuildMember) {
					// Création de l'embed
					const logEmbed = new EmbedBuilder()
						.setColor('C9572A')
						.setAuthor({
							name: displayNameAndID(banAction, banAction),
							iconURL: banAction.displayAvatarURL({ dynamic: true }),
						})
						.setDescription(
							`\`\`\`\n${client.user.tag} : Scam Nitro / Steam (Automod)\`\`\``,
						)
						.addFields([
							{
								name: 'Mention',
								value: banAction.toString(),
								inline: true,
							},
							{
								name: 'Date de création du compte',
								value: convertDateForDiscord(banAction.user.createdAt),
								inline: true,
							},
							{
								name: 'Âge du compte',
								value: diffDate(banAction.user.createdAt),
								inline: true,
							},
						])
						.setFooter({
							iconURL: banAction.user.displayAvatarURL({ dynamic: true }),
							text: `Membre banni par ${banAction.user.tag}`,
						})
						.setTimestamp(new Date())

					return logsChannel.send({ embeds: [logEmbed] })
				}

				if (banAction instanceof Error || DMMessageBan instanceof Error)
					// Si au moins une erreur, throw
					throw new Error(
						"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
					)
			}
		})
	}

	// Fin Automod

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

	// Répondre emoji :feur:
	const feurChannels = client.config.guild.managers.FEUR_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.FEUR_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (feurChannels.includes(message.channel.id)) {
		const random = Math.round(Math.random() * 100)

		// 10% de chances
		if (random >= 45 && random <= 55) {
			const regexFeur =
				/.*[qQ][uU][oO][iI]([^a-zA-Z]*|(<:[a-zA-Z0-9]+:[0-9]+>)|(:[a-zA-Z0-9]+:))*$/
			const feurEmoji = client.emojis.cache.find(emoji => emoji.name === 'feur')
			if (message.content.match(regexFeur)) message.react(feurEmoji)
		}
	}

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
		if (message.content.toLowerCase().includes(alert.text)) {
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
		if (!client.cooldowns.has(commandName)) client.cooldowns.set(command.name, new Collection())
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

				// Suppression du message
				return client.cache.deleteMessagesID.add(sentMessage.id)
			}
		}
		timestamps.set(message.author.id, now)
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)

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
		// // Répondre émoji si @bot
		if (message.mentions.users.has(client.user.id) && !message.mentions.repliedUser) {
			// eslint-disable-next-line max-len
			// const pingEmoji = client.emojis.cache.find(emoji => emoji.name === 'ping')
			// if (pingEmoji) message.react(pingEmoji)

			const chatgpt = new ChatGPTAPI({
				apiKey: client.config.others.openAiKey,
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
