import {
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
	PermissionsBitField,
} from 'discord.js'
import { convertDate, displayNameAndID } from '../../util/util.js'
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
