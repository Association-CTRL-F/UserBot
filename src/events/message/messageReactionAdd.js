import { convertDateForDiscord } from '../../util/util.js'
import { Constants, MessageEmbed } from 'discord.js'
import ms from 'ms'

export default async (messageReaction, user, client) => {
	const { message, emoji } = messageReaction

	if (message.partial) await message.fetch()
	if (messageReaction.partial) await messageReaction.fetch()

	if (user.bot || !message.guild || !message.guild.available) return

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition des paramètres de la guild
	let configGuild = {}
	try {
		const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
		const dataSelect = [message.guild.id]
		const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
		configGuild = resultSelect[0]
	} catch (error) {
		return console.log(error)
	}

	// Partie système de réactions / rôles
	if (client.reactionRoleMap.has(message.id)) {
		const emojiRoleMap = client.reactionRoleMap.get(message.id)
		const resolvedEmoji = emoji.id || emoji.name
		const { id: roleID, giveJoinRole = false } = emojiRoleMap[resolvedEmoji]
		const guildMember = await message.guild.members.fetch(user)

		// Système rôle arrivant
		if (giveJoinRole) {
			const joinRole = configGuild.JOIN_ROLE_ID
			await guildMember.roles.add(joinRole)

			setTimeout(
				() =>
					guildMember.roles.remove(joinRole).catch(error => {
						if (error.code !== Constants.APIErrors.UNKNOWN_MEMBER) throw error
					}),
				ms(configGuild.TIMEOUT_JOIN),
			)
		}

		return guildMember.roles.add(roleID)
	}

	switch (emoji.name) {
		// Si c'est un signalement (report)
		case '🚨': {
			if (message.author.bot || !message.guild) return

			// On ne peut pas report son propre message
			if (message.author === user) return messageReaction.users.remove(user)

			const reportChannel = message.guild.channels.cache.get(configGuild.REPORT_CHANNEL_ID)
			if (!reportChannel) return

			const fetchedMessages = await reportChannel.messages.fetch()

			// Recherche si un report a déjà été posté
			const logReport = fetchedMessages
				.filter(msg => msg.embeds)
				.find(msg => msg.embeds[0].fields.find(field => field.value.includes(message.id)))

			// Si un report a déjà été posté
			if (logReport) {
				const logReportEmbed = logReport.embeds[0]

				// On return si l'utilisateur a déjà report ce message
				if (logReportEmbed.fields.some(field => field.value.includes(user.id)))
					return messageReaction.users.remove(user)

				const editLogReport = {
					author: logReportEmbed.author,
					description: logReportEmbed.description,
					fields: [logReportEmbed.fields],
				}

				// On ajoute un field en fonction
				// du nombre de report qu'il y a déjà
				switch (logReportEmbed.fields.length - 3) {
					case 1:
						editLogReport.color = 'ff8200'
						editLogReport.fields.push({
							name: '2nd signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
						})
						break

					case 2:
						editLogReport.color = 'ff6600'
						editLogReport.fields.push({
							name: '3ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
						})
						break

					case 3:
						editLogReport.color = 'ff3200'
						editLogReport.fields.push({
							name: '4ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
						})

						client.cache.deleteMessagesID.add(messageReaction.message.id)
						messageReaction.message.delete()
						break

					default:
						break
				}

				// Edit de l'embed
				return logReport.edit({ embeds: [editLogReport] })
			}

			// S'il n'y a pas de report déjà posté
			const sendLogReport = new MessageEmbed()
				.setDescription(`**Contenu du message**\n\`\`\`${message.content}\`\`\``)
				.setAuthor({
					name: 'Nouveau signalement',
					iconURL: message.author.displayAvatarURL({ dynamic: true }),
				})
				.addFields([
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
						name: 'Message',
						value: `[Posté le ${convertDateForDiscord(message.createdAt)}](${
							message.url
						})`,
						inline: true,
					},
				])

			switch (messageReaction.count) {
				case 1:
					sendLogReport.color = 'FFAE00'
					sendLogReport.fields.push({
						name: '1er signalement',
						value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
					})
					break

				case 2:
					sendLogReport.color = 'FF8200'
					sendLogReport.fields.push(
						{
							name: '1er signalement',
							value: '?',
						},
						{
							name: '2nd signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
						},
					)
					break

				case 3:
					sendLogReport.color = 'FF6600'
					sendLogReport.fields.push(
						{
							name: '1er signalement',
							value: '?',
						},
						{
							name: '2nd signalement',
							value: '?',
						},
						{
							name: '3ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
						},
					)
					break

				case 4:
					sendLogReport.color = 'FF3200'
					sendLogReport.fields.push(
						{
							name: '1er signalement',
							value: '?',
						},
						{
							name: '2nd signalement',
							value: '?',
						},
						{
							name: '3ème signalement',
							value: '?',
						},
						{
							name: '4ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
						},
					)

					client.cache.deleteMessagesID.add(messageReaction.message.id)
					messageReaction.message.delete()
					break

				default:
					break
			}

			// Envoi de l'embed
			return reportChannel.send({ embeds: [sendLogReport] })
		}

		default:
			break
	}
}
