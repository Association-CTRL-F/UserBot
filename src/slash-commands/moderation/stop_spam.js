import {
	EmbedBuilder,
	ContextMenuCommandBuilder,
	RESTJSONErrorCodes,
	ApplicationCommandType,
	MessageFlags
} from 'discord.js'
import { displayNameAndID } from '../../util/util.js'

const truncateForCodeBlock = (text, max = 1012) => {
	if (!text || !text.trim()) return '[Aucun contenu texte]'
	const escaped = text.replace(/```/g, '\\`\\`\\`')
	return escaped.length < 1024 ? escaped : `${escaped.slice(0, max)} [...]`
}

export default {
	contextMenu: new ContextMenuCommandBuilder()
		.setName('stop_spam')
		.setType(ApplicationCommandType.Message),

	interaction: async (interaction, client) => {
		if (interaction.commandType !== ApplicationCommandType.Message) return

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		// Acquisition du message
		const message = interaction.targetMessage
		if (!message || !message.guild) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé le message ciblé 😕",
			})
		}

		// On ne peut pas déclarer comme spam le message d'un bot
		if (message.author.bot) {
			return interaction.editReply({
				content: 'Tu ne peux pas déclarer les messages du bot comme spam 😕',
			})
		}

		// On ne peut pas déclarer son propre message comme spam
		if (message.author.id === interaction.user.id) {
			return interaction.editReply({
				content: 'Tu ne peux pas déclarer ton propre message comme spam 😕',
			})
		}

		// Acquisition du salon de logs
		const logsChannel = message.guild.channels.cache.get(
			client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
		)

		// Acquisition du membre
		const member = await interaction.guild.members.fetch(message.author.id).catch(() => null)
		if (!member) {
			return interaction.editReply({
				content:
					"Je n'ai pas trouvé cet utilisateur, il n'est sans doute plus présent sur le serveur 😕",
			})
		}

		const messagePreview = truncateForCodeBlock(message.content)

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Spam')
			.setDescription(
				'Merci de ne pas spammer ton message dans plusieurs salons.\nSi nous constatons à nouveau ce genre de pratique, nous sanctionnerons sans avertissement préalable.\nMerci également de relire notre règlement.',
			)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
				url: interaction.guild.vanityURL ?? undefined,
			})
			.addFields({
				name: 'Message posté',
				value: `\`\`\`${messagePreview}\`\`\``,
			})

		const logEmbed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Spam')
			.setAuthor({
				name: displayNameAndID(message.member, message.author),
				iconURL: message.author.displayAvatarURL({ dynamic: true }),
			})
			.addFields(
				{
					name: 'Message posté',
					value: `\`\`\`${messagePreview}\`\`\``,
				},
				{
					name: 'Salon',
					value: message.channel.toString(),
					inline: true,
				},
				{
					name: 'Message',
					value: `[Aller au message](${message.url})`,
					inline: true,
				},
			)
			.setFooter({
				iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				text: `Déclaré par ${interaction.user.tag}`,
			})
			.setTimestamp(new Date())

		try {
			await member.send({
				embeds: [embed],
			})
		} catch (error) {
			if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
				return interaction.editReply({
					content:
						"Spam non déclaré 😬\nL'utilisateur m'a sûrement bloqué / désactivé les messages provenant du serveur",
				})
			}

			console.error(error)
			return interaction.editReply({
				content: "Une erreur est survenue lors de l'envoi du message privé 😬",
			})
		}

		if (logsChannel?.isTextBased()) {
			await logsChannel
				.send({
					embeds: [logEmbed],
				})
				.catch(console.error)
		}

		await message.delete().catch((error) => {
			if (error.code !== RESTJSONErrorCodes.UnknownMessage) throw error
		})

		return interaction.editReply({
			content: 'Spam déclaré 👌',
		})
	},
}
