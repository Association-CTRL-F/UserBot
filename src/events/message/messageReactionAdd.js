import { convertDateForDiscord } from '../../util/util.js'
import { Constants } from 'discord.js'
import ms from 'ms'

export default async (messageReaction, user, client) => {
	const { message, emoji } = messageReaction

	if (message.partial) await message.fetch()
	if (messageReaction.partial) await messageReaction.fetch()

	if (
		user.bot ||
		!message.guild ||
		!message.guild.available ||
		message.guild.id !== client.config.guild.guildID
	)
		return

	// Partie système de réactions / rôles
	if (client.reactionRoleMap.has(message.id)) {
		const emojiRoleMap = client.reactionRoleMap.get(message.id)
		const resolvedEmoji = emoji.id || emoji.name
		const { id: roleID, giveJoinRole = false } = emojiRoleMap[resolvedEmoji]
		const guildMember = await message.guild.members.fetch(user)

		// Système rôle arrivant
		if (giveJoinRole) {
			const joinRole = client.config.guild.roles.joinRoleID
			await guildMember.roles.add(joinRole)

			setTimeout(
				() =>
					guildMember.roles.remove(joinRole).catch(error => {
						if (error.code !== Constants.APIErrors.UNKNOWN_MEMBER) throw error
					}),
				ms(client.config.guild.timeoutJoin),
			)
		}

		return guildMember.roles.add(roleID)
	}

	switch (emoji.name) {
		// Si c'est un signalement (report)
		case '🚨': {
			if (message.author.bot || !message.guild) return

			// On ne peut pas report un message posté pour soi-même
			if (message.author === user) return messageReaction.users.remove(user)

			const reportChannel = message.guild.channels.cache.get(
				client.config.guild.channels.reportChannelID,
			)
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
				if (logReportEmbed.fields.some(field => field.value.includes(user.id))) return

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
							inline: false,
						})
						break
					case 2:
						editLogReport.color = 'ff6600'
						editLogReport.fields.push({
							name: '3ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
							inline: false,
						})
						break
					case 3:
						editLogReport.color = 'ff3200'
						editLogReport.fields.push({
							name: '4ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
							inline: false,
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
			const sendLogReport = {
				author: {
					name: 'Nouveau signalement',
					icon_url: message.author.displayAvatarURL({ dynamic: true }),
				},
				description: `**Contenu du message**\n${message.content}`,
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
						name: 'Message',
						value: `[Posté le ${convertDateForDiscord(message.createdAt)}](${
							message.url
						})`,
						inline: true,
					},
				],
			}

			switch (messageReaction.count) {
				case 1:
					sendLogReport.color = 'ffae00'
					sendLogReport.fields.push({
						name: '1er signalement',
						value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
						inline: false,
					})
					break
				case 2:
					sendLogReport.color = 'ff8200'
					sendLogReport.fields.push(
						{
							name: '1er signalement',
							value: '?',
							inline: false,
						},
						{
							name: '2nd signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
							inline: false,
						},
					)
					break
				case 3:
					sendLogReport.color = 'ff6600'
					sendLogReport.fields.push(
						{
							name: '1er signalement',
							value: '?',
							inline: false,
						},
						{
							name: '2nd signalement',
							value: '?',
							inline: false,
						},
						{
							name: '3ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
							inline: false,
						},
					)
					break
				case 4:
					sendLogReport.color = 'ff3200'
					sendLogReport.fields.push(
						{
							name: '1er signalement',
							value: '?',
							inline: false,
						},
						{
							name: '2nd signalement',
							value: '?',
							inline: false,
						},
						{
							name: '3ème signalement',
							value: '?',
							inline: false,
						},
						{
							name: '4ème signalement',
							value: `Signalement de ${user} le ${convertDateForDiscord(Date.now())}`,
							inline: false,
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
