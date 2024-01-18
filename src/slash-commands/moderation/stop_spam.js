import { EmbedBuilder, ContextMenuCommandBuilder, RESTJSONErrorCodes } from 'discord.js'
import { displayNameAndID } from '../../util/util.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('stop_spam').setType(3),
	interaction: async (interaction, client) => {
		if (!interaction.commandType === 3) return

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Acquisition du message
		const message = interaction.targetMessage

		// On ne peut pas déclarer comme spam le message d'un bot
		if (message.author.bot || !message.guild)
			return interaction.editReply({
				content: 'Tu ne peux pas déclarer les messages du bot comme spam 😕',
			})

		// On ne peut pas déclarer son propre message comme spam
		if (message.author === interaction.user)
			return interaction.editReply({
				content: 'Tu ne peux pas déclarer ton propre message comme spam 😕',
			})

		// Acquisition du salon de logs
		const logsChannel = message.guild.channels.cache.get(
			client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
		)

		// Acquisition du membre
		const member = interaction.guild.members.cache.get(message.author.id)
		if (!member)
			return interaction.editReply({
				content:
					"Je n'ai pas trouvé cet utilisateur, il n'est sans doute plus présent sur le serveur 😕",
				ephemeral: true,
			})

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Spam')
			.setDescription(
				'Merci de ne pas spammer ton message dans plusieurs salons.\nSi nous constatons à nouveau ce genre de pratique, nous sanctionnerons sans avertissement préalable.\nMerci également de relire notre règlement.',
			)
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
			.setTitle('Spam')
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
					"Spam non déclaré 😬\nL'utilisateur m'a sûrement bloqué / désactivé les messages provenant du serveur",
				ephemeral: true,
			})
		}

		await message.delete()

		return interaction.editReply({
			content: 'Spam déclaré 👌',
		})
	},
}
