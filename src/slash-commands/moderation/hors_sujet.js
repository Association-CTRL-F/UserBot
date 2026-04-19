import {
	EmbedBuilder,
	ContextMenuCommandBuilder,
	RESTJSONErrorCodes,
	ApplicationCommandType,
	MessageFlags,
} from 'discord.js'
import { displayNameAndID } from '../../util/util.js'

const truncateForCodeBlock = (text, max = 1012) => {
	if (!text || !text.trim()) return '[Aucun contenu texte]'
	const cleaned = text.replace(/```/g, '\\`\\`\\`')
	return cleaned.length < 1024 ? cleaned : `${cleaned.slice(0, max)} [...]`
}

export default {
	contextMenu: new ContextMenuCommandBuilder()
		.setName('hors_sujet')
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

		// On ne peut pas définir hors-sujet le message d'un bot
		if (message.author.bot) {
			return interaction.editReply({
				content: "Tu ne peux pas déclarer hors-sujet le message d'un bot 😕",
			})
		}

		// On ne peut pas définir hors-sujet son propre message
		if (message.author.id === interaction.user.id) {
			return interaction.editReply({
				content: 'Tu ne peux pas définir hors-sujet ton propre message 😕',
			})
		}

		// Acquisition du membre cible
		const member = await interaction.guild.members.fetch(message.author.id).catch(() => null)
		if (!member) {
			return interaction.editReply({
				content:
					"Je n'ai pas trouvé cet utilisateur, il n'est sans doute plus présent sur le serveur 😕",
			})
		}

		// Acquisition du salon de logs
		const logsChannel = message.guild.channels.cache.get(
			client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
		)

		const messagePreview = truncateForCodeBlock(message.content)

		const description = `Ton message est hors-sujet, merci de veiller à bien respecter les salons du serveur.

• Il n'y a pas d'entraide dans le salon <#${client.config.guild.channels.BLABLA_CHANNEL_ID}>.
• Si tu ne trouves pas le bon salon, tu peux te référer au menu "Salons & Rôles" en haut de la liste des salons afin de choisir tes différents accès.`

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Hors-sujet')
			.setDescription(description)
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
			.setTitle('Hors-sujet')
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
						"Hors-sujet non déclaré 😬\nL'utilisateur m'a sûrement bloqué / désactivé les messages provenant du serveur",
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
			content: 'Hors-sujet déclaré 👌',
		})
	},
}
