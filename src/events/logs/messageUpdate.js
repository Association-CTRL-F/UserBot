import {
	GuildMember,
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
	PermissionsBitField,
} from 'discord.js'
import {
	convertDate,
	displayNameAndID,
	isStaffMember,
	convertDateForDiscord,
	diffDate,
	findLinks,
	getFinalLink,
	isLinkMalicious,
} from '../../util/util.js'
import { ChatGPTAPI } from 'chatgpt'

export default async (oldMessage, newMessage, client) => {
	if (
		oldMessage.author.bot ||
		!oldMessage.guild ||
		!oldMessage.guild.available ||
		newMessage.author.bot ||
		!newMessage.guild ||
		!newMessage.guild.available
	)
		return

	if (oldMessage.partial) await oldMessage.fetch()
	if (newMessage.partial) await newMessage.fetch()

	// Acquisition du salon de logs
	const logsChannelMessages = newMessage.guild.channels.cache.get(
		client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
	)
	if (!logsChannelMessages) return

	// Vérification si le salon du message
	// est dans la liste des salons à ne pas logger
	const NOLOGS = client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (NOLOGS.includes(newMessage.channel.id)) return

	if (oldMessage.content !== newMessage.content) {
		// Création de l'embed
		const logEmbedMessage = new EmbedBuilder()
			.setColor('#C27C0E')
			.setAuthor({
				name: displayNameAndID(newMessage.member, newMessage.author),
				iconURL: newMessage.author.displayAvatarURL({ dynamic: true }),
			})
			.addFields([
				{
					name: 'Ancien message',
					value: `\`\`\`\n${oldMessage.content.replace(/```/g, '\\`\\`\\`')}\`\`\``,
					inline: false,
				},
				{
					name: 'Nouveau message',
					value: `\`\`\`\n${newMessage.content.replace(/```/g, '\\`\\`\\`')}\`\`\``,
					inline: false,
				},
				{
					name: 'Auteur',
					value: newMessage.author.toString(),
					inline: true,
				},
				{
					name: 'Salon',
					value: `[Aller au message](${
						newMessage.url
					}) - ${newMessage.channel.toString()}`,
					inline: true,
				},
			])
			.setFooter({
				text: `Posté le ${convertDate(oldMessage.createdAt)}\nModifié le ${convertDate(
					newMessage.editedAt,
				)}`,
			})

		await logsChannelMessages.send({ embeds: [logEmbedMessage] })
	}

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Automod //

	// Acquisition du salon de logs liste-ban
	const logsChannelBans = newMessage.guild.channels.cache.get(
		client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
	)
	if (!logsChannelBans) return

	// Partie domaines
	const staffRoles = client.config.guild.managers.STAFF_ROLES_MANAGER_IDS
		? client.config.guild.managers.STAFF_ROLES_MANAGER_IDS.split(/, */)
		: []

	if (!isStaffMember(newMessage.member, staffRoles)) {
		const sentMessage = await newMessage.fetch().catch(() => false)

		let guildMember = {}
		if (newMessage.guild)
			guildMember = await newMessage.guild.members
				.fetch(sentMessage.author)
				.catch(() => false)

		if (!sentMessage || !guildMember) return

		const messageLinks = await findLinks(newMessage.content)
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
					const logEmbedBan = new EmbedBuilder()
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

					return logsChannelBans.send({ embeds: [logEmbedBan] })
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

	if (NOTEXT.includes(newMessage.channel.id) && newMessage.attachments.size < 1) {
		const sentMessage = await newMessage.channel.send(
			`<@${newMessage.author.id}>, tu dois mettre une image / vidéo 😕`,
		)
		return Promise.all([
			await newMessage.delete().catch(() => false),
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

	if (THREADS.includes(newMessage.channel.id)) {
		await newMessage.react('⬆️')
		await newMessage.react('⬇️')
		await newMessage.react('💬')
	}

	// Répondre emoji :feur:
	const feurChannels = client.config.guild.managers.FEUR_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.FEUR_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (feurChannels.includes(newMessage.channel.id)) {
		const random = Math.round(Math.random() * 100)

		// 10% de chances
		if (random >= 45 && random <= 55) {
			const regexFeur =
				/.*[qQ][uU][oO][iI]([^a-zA-Z]*|(<:[a-zA-Z0-9]+:[0-9]+>)|(:[a-zA-Z0-9]+:))*$/
			const feurEmoji = client.emojis.cache.find(emoji => emoji.name === 'feur')
			if (newMessage.content.match(regexFeur)) newMessage.react(feurEmoji)
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
		if (newMessage.content.toLowerCase().includes(alert.text)) {
			// Acquisition du membre
			const member = newMessage.guild.members.cache.get(alert.discordID)

			// Si c'est son propre message on envoi pas d'alerte
			if (newMessage.author.id === alert.discordID) return

			// Vérification si le membre à accès au salon
			// dans lequel le message a été envoyé
			const permissionsMember = member.permissionsIn(newMessage.channel)
			if (!permissionsMember.has(PermissionsBitField.Flags.ViewChannel)) return

			// Cut + escape message content
			let textCut = ''
			let alertTextCut = ''

			if (newMessage.content.length < 200) textCut = `${newMessage.content.substr(0, 200)}`
			else textCut = `${newMessage.content.substr(0, 200)} [...]`

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
					name: newMessage.guild.name,
					iconURL: newMessage.guild.iconURL({ dynamic: true }),
					url: newMessage.guild.vanityURL,
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
						value: newMessage.channel.toString(),
						inline: true,
					},
					{
						name: 'Auteur',
						value: `${newMessage.author.toString()} (ID : ${newMessage.author.id})`,
						inline: true,
					},
				])

			const buttonMessage = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel('Aller au message')
					.setStyle(ButtonStyle.Link)
					.setURL(
						`https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`,
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

	if (newMessage.guild)
		if (newMessage.mentions.users.has(client.user.id) && !newMessage.mentions.repliedUser) {
			// Répondre aux messages avec mention en utilisant ChatGPT
			// // Répondre émoji si @bot
			// eslint-disable-next-line max-len
			// const pingEmoji = client.emojis.cache.find(emoji => emoji.name === 'ping')
			// if (pingEmoji) message.react(pingEmoji)

			const chatgpt = new ChatGPTAPI({
				apiKey: client.config.others.openAiKey,
			})

			try {
				const chatgptResponse = await chatgpt.sendMessage(newMessage.content)
				if (
					chatgptResponse.text.includes('@everyone') ||
					chatgptResponse.text.includes('@here')
				)
					return newMessage.reply({
						content: `Désolé, je ne peux pas mentionner ${newMessage.guild.memberCount} personnes 😬`,
					})

				if (chatgptResponse.text.length > 1960)
					return newMessage.reply({
						content: `**[Réponse partielle]**\n\n${chatgptResponse.text.substr(
							0,
							1960,
						)} [...]`,
					})

				return newMessage.reply({ content: chatgptResponse.text })
			} catch (error) {
				console.error(error)
				return newMessage.reply({ content: 'Une erreur est survenue 😬' })
			}
		}
}
