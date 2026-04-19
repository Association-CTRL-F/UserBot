import { convertDateForDiscord } from '../../util/util.js'
import { EmbedBuilder } from 'discord.js'

const getReportColor = (count) => {
	switch (count) {
		case 1:
			return 0xffae00
		case 2:
			return 0xff8200
		case 3:
			return 0xff6600
		default:
			return 0xff3200
	}
}

const getReportFieldName = (count) => {
	switch (count) {
		case 1:
			return '1er signalement'
		case 2:
			return '2nd signalement'
		case 3:
			return '3ème signalement'
		default:
			return '4ème signalement'
	}
}

const isReportField = (field) => /signalement/i.test(field.name)

export default async (messageReaction, user, client) => {
	const { message, emoji } = messageReaction

	if (message.partial) {
		await message.fetch().catch(() => null)
		if (message.partial) return
	}

	if (messageReaction.partial) {
		await messageReaction.fetch().catch(() => null)
		if (messageReaction.partial) return
	}

	if (user.bot || !message.guild || !message.guild.available) return

	switch (emoji.name) {
		// Si c'est un signalement (report)
		case '🚨': {
			if (message.author?.bot) return

			// On ne peut pas report son propre message
			if (message.author?.id === user.id) {
				await messageReaction.users.remove(user.id).catch(() => null)
				return
			}

			const reportChannel = message.guild.channels.cache.get(
				client.config.guild.channels.REPORT_CHANNEL_ID,
			)
			if (!reportChannel || !reportChannel.isTextBased()) return

			const fetchedMessages = await reportChannel.messages
				.fetch({ limit: 100 })
				.catch(() => null)
			if (!fetchedMessages) return

			// Recherche si un report a déjà été posté pour ce message
			const logReport = fetchedMessages.find((msg) => {
				const embed = msg.embeds?.[0]
				if (!embed?.fields?.length) return false

				return embed.fields.some(
					(field) => field.name === 'ID du message' && field.value === message.id,
				)
			})

			const reportLine = `Signalement de ${user} (ID : ${user.id}) le ${convertDateForDiscord(
				new Date(),
			)}`

			// Si un report a déjà été posté
			if (logReport) {
				const logReportEmbed = logReport.embeds[0]
				if (!logReportEmbed) return

				const existingFields = logReportEmbed.fields ?? []
				const baseFields = existingFields.filter((field) => !isReportField(field))
				const reportFields = existingFields.filter((field) => isReportField(field))

				// On return si l'utilisateur a déjà report ce message
				if (reportFields.some((field) => field.value.includes(`ID : ${user.id}`))) {
					await messageReaction.users.remove(user.id).catch(() => null)
					return
				}

				const nextCount = Math.min(reportFields.length + 1, 4)
				const updatedReportFields = [
					...reportFields,
					{
						name: getReportFieldName(nextCount),
						value: reportLine,
						inline: false,
					},
				]

				const updatedEmbed = EmbedBuilder.from(logReportEmbed)
					.setColor(getReportColor(updatedReportFields.length))
					.setFields([...baseFields, ...updatedReportFields])

				await logReport.edit({ embeds: [updatedEmbed] }).catch(console.error)

				if (updatedReportFields.length >= 4) {
					client.cache.deleteMessagesID.add(message.id)
					await message.delete().catch(() => null)
				}

				await messageReaction.users.remove(user.id).catch(() => null)
				return
			}

			// S'il n'y a pas de report déjà posté
			const escapedContent = (message.content || '[Message sans contenu texte]')
				.replace(/```/g, '\\`\\`\\`')
				.slice(0, 3900)

			const sendLogReport = new EmbedBuilder()
				.setColor(getReportColor(1))
				.setDescription(`**Contenu du message**\n\`\`\`\n${escapedContent}\n\`\`\``)
				.setAuthor({
					name: 'Nouveau signalement',
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
						name: 'Message',
						value: `[Posté le ${convertDateForDiscord(message.createdAt)}](${message.url})`,
						inline: true,
					},
					{
						name: 'ID du message',
						value: message.id,
						inline: false,
					},
					{
						name: '1er signalement',
						value: reportLine,
						inline: false,
					},
				)

			await reportChannel.send({ embeds: [sendLogReport] }).catch(console.error)
			await messageReaction.users.remove(user.id).catch(() => null)
			return
		}

		// Si c'est un salon auto-thread
		case '💬': {
			const THREADS = client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS
				? client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS.split(/, */)
				: []

			if (THREADS.includes(message.channel.id) && !message.hasThread) {
				await message
					.startThread({
						name: `Thread de ${message.member?.displayName || message.author.username}`,
						// Archivage après 24H
						autoArchiveDuration: 24 * 60,
					})
					.catch(() => null)
			}

			await messageReaction.users.remove(user.id).catch(() => null)
		}

		default:
	}
}
