import { EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } from 'discord.js'
import { convertDateForDiscord } from '../../util/util.js'

const truncateForCodeBlock = (text, max = 1000) => {
	if (!text || !text.trim()) return '[Aucun contenu texte]'
	const escaped = text.replace(/```/g, '\\`\\`\\`')
	return escaped.length <= max ? escaped : `${escaped.slice(0, max - 6)} [...]`
}

const getReportMetaFieldCount = () => 3

const getReportFieldName = (reportCount) => {
	switch (reportCount) {
		case 1:
			return '1er signalement'
		case 2:
			return '2nd signalement'
		case 3:
			return '3ème signalement'
		case 4:
			return '4ème signalement'
		default:
			return `${reportCount}ème signalement`
	}
}

const getReportColor = (reportCount) => {
	switch (reportCount) {
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

export default {
	contextMenu: new ContextMenuCommandBuilder()
		.setName('signaler')
		.setType(ApplicationCommandType.Message),

	interaction: async (interaction, client) => {
		if (interaction.commandType !== ApplicationCommandType.Message) return

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		const message = interaction.targetMessage
		if (!message || !message.guild) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé le message ciblé 😕",
			})
		}

		if (message.author.bot) {
			return interaction.editReply({
				content: "Tu ne peux pas signaler le message d'un bot 😕",
			})
		}

		if (message.author.id === interaction.user.id) {
			return interaction.editReply({
				content: 'Tu ne peux pas signaler ton propre message 😕',
			})
		}

		const reportChannel = message.guild.channels.cache.get(
			client.config.guild.channels.REPORT_CHANNEL_ID,
		)

		if (!reportChannel?.isTextBased()) {
			return interaction.editReply({
				content: "Il n'y a pas de salon de signalement valide 😕",
			})
		}

		const fetchedMessages = await reportChannel.messages.fetch().catch((error) => {
			console.error(error)
			return null
		})

		if (!fetchedMessages) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la récupération des signalements 😬',
			})
		}

		const logReport = fetchedMessages.find((msg) =>
			msg.embeds?.[0]?.fields?.some((field) => field.value?.includes(message.id)),
		)

		if (logReport) {
			const logReportEmbed = logReport.embeds[0]

			if (logReportEmbed.fields.some((field) => field.value?.includes(interaction.user.id))) {
				return interaction.editReply({
					content: 'Tu as déjà signalé ce message 😕',
				})
			}

			const existingFields = [...logReportEmbed.fields]
			const currentReportCount = Math.max(
				0,
				existingFields.length - getReportMetaFieldCount(),
			)
			const nextReportCount = currentReportCount + 1

			const updatedEmbed = new EmbedBuilder()
				.setColor(getReportColor(nextReportCount))
				.setDescription(logReportEmbed.description ?? null)

			if (logReportEmbed.author) {
				updatedEmbed.setAuthor({
					name: logReportEmbed.author.name,
					iconURL: logReportEmbed.author.iconURL ?? undefined,
					url: logReportEmbed.author.url ?? undefined,
				})
			}

			updatedEmbed.addFields(...existingFields, {
				name: getReportFieldName(nextReportCount),
				value: `Signalement de ${interaction.user} le ${convertDateForDiscord(Date.now())}`,
			})

			await logReport.edit({ embeds: [updatedEmbed] })

			if (nextReportCount >= 4) {
				await message.delete().catch((error) => {
					console.error(error)
				})

				return interaction.editReply({
					content: 'Le message a reçu 4 signalements et a donc été supprimé 👌',
				})
			}

			return interaction.editReply({
				content: 'Message signalé 👌',
			})
		}

		const preview = truncateForCodeBlock(message.content)

		const sendLogReport = new EmbedBuilder()
			.setDescription(`**Contenu du message**\n\`\`\`${preview}\`\`\``)
			.setColor(getReportColor(1))
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
					name: '1er signalement',
					value: `Signalement de ${interaction.user} le ${convertDateForDiscord(
						Date.now(),
					)}`,
				},
			)

		await reportChannel.send({ embeds: [sendLogReport] })

		return interaction.editReply({
			content: 'Message signalé 👌',
		})
	},
}
