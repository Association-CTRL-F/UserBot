import { EmbedBuilder, ContextMenuCommandBuilder, RESTJSONErrorCodes } from 'discord.js'
import { displayNameAndID } from '../../util/util.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('hors_sujet').setType(3),
	interaction: async (interaction, client) => {
		if (!interaction.commandType === 3) return

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Acquisition du message
		const message = interaction.targetMessage

		// On ne peut pas définir hors-sujet le message d'un bot
		if (message.author.bot || !message.guild)
			return interaction.editReply({
				content: "Tu ne peux pas déclarer hors-sujet le message d'un bot 😕",
			})

		// On ne peut pas définir hors-sujet son propre message
		if (message.author === interaction.user)
			return interaction.editReply({
				content: 'Tu ne peux pas définir hors-sujet ton propre message 😕',
			})

		// Acquisition du salon de logs
		const logsChannel = message.guild.channels.cache.get(
			client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
		)

		const member = interaction.guild.members.cache.get(message.author.id)
		if (!member)
			return interaction.editReply({
				content:
					"Je n'ai pas trouvé cet utilisateur, il n'est sans doute plus présent sur le serveur 😕",
				ephemeral: true,
			})

		const description = `Ton message est hors-sujet, merci de veiller à bien respecter les salons du serveur.\n\n• Il n'y a pas d'entraide dans le salon <#${client.config.guild.channels.BLABLA_CHANNEL_ID}>.\n• Si tu ne trouves pas le bon salon, tu peux te référer au menu "Salons & Rôles" en haut de la liste des salons afin de choisir tes différents accès.`

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Hors-sujet')
			.setDescription(description)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			})
			.addFields([
				{
					name: 'Message posté',
					value: `\`\`\`${
						message.content.length < 1024
							? message.content
							: `${message.content.substr(0, 1012)} [...]`
					}\`\`\``,
				},
			])

		const logEmbed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Hors-sujet')
			.setAuthor({
				name: displayNameAndID(message.author, message.author),
				iconURL: message.author.displayAvatarURL({ dynamic: true }),
			})
			.addFields([
				{
					name: 'Message posté',
					value: `\`\`\`${
						message.content.length < 1024
							? message.content
							: `${message.content.substr(0, 1012)} [...]`
					}\`\`\``,
				},
			])
			.setFooter({
				iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				text: `Déclaré par ${interaction.user.tag}`,
			})
			.setTimestamp(new Date())

		try {
			await member.send({
				embeds: [embed],
			})

			await logsChannel.send({
				embeds: [logEmbed],
			})
		} catch (error) {
			if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) throw error

			return interaction.editReply({
				content:
					"Hors-sujet non déclaré 😬\nL'utilisateur m'a sûrement bloqué / désactivé les messages provenant du serveur",
				ephemeral: true,
			})
		}

		await message.delete()

		return interaction.editReply({
			content: 'Hors-sujet déclaré 👌',
		})
	},
}
