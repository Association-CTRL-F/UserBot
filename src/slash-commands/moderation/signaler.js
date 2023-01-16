import { convertDateForDiscord } from '../../util/util.js'
import { EmbedBuilder, ContextMenuCommandBuilder } from 'discord.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('signaler').setType(3),
	interaction: async (interaction, client) => {
		if (!interaction.commandType === 3) return

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		const message = interaction.targetMessage

		if (message.author.bot || !message.guild)
			return interaction.editReply({
				content: "Tu ne peux pas signaler le message d'un bot 😕",
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition des paramètres de la guild
		let configGuild = {}
		try {
			const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
			const dataSelect = [interaction.guild.id]
			const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
			configGuild = resultSelect[0]
		} catch (error) {
			return console.log(error)
		}

		// On ne peut pas signaler son propre message
		if (message.author === interaction.user)
			return interaction.editReply({
				content: 'Tu ne peux pas signaler ton propre message 😕',
			})

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
			if (logReportEmbed.fields.some(field => field.value.includes(interaction.user.id)))
				return interaction.editReply({
					content: 'Tu as déjà signalé ce message 😕',
				})

			const editLogReport = {
				author: logReportEmbed.author,
				description: logReportEmbed.description,
				fields: [logReportEmbed.fields],
			}

			// On ajoute un field en fonction
			// du nombre de report qu'il y a déjà
			switch (logReportEmbed.fields.length - 3) {
				case 1:
					editLogReport.color = 'FF8200'
					editLogReport.fields.push({
						name: '2nd signalement',
						value: `Signalement de ${interaction.user} le ${convertDateForDiscord(
							Date.now(),
						)}`,
					})
					break

				case 2:
					editLogReport.color = 'FF6600'
					editLogReport.fields.push({
						name: '3ème signalement',
						value: `Signalement de ${interaction.user} le ${convertDateForDiscord(
							Date.now(),
						)}`,
					})
					break

				case 3:
					editLogReport.color = 'FF3200'
					editLogReport.fields.push({
						name: '4ème signalement',
						value: `Signalement de ${interaction.user} le ${convertDateForDiscord(
							Date.now(),
						)}`,
					})
					break

				default:
					break
			}

			// Edit de l'embed
			await logReport.edit({ embeds: [editLogReport] })

			if (logReportEmbed.fields.length - 3 === 3) {
				await message.delete().catch(() =>
					interaction.editReply({
						content:
							'Le message a reçu 4 signalements mais une erreur est survenue lors de sa suppression 😬',
					}),
				)

				return interaction.editReply({
					content: 'Le message a reçu 4 signalements et a donc été supprimé 👌',
				})
			}

			return interaction.editReply({
				content: 'Message signalé 👌',
			})
		}

		// S'il n'y a pas de report déjà posté
		const sendLogReport = new EmbedBuilder()
			.setDescription(`**Contenu du message**\n\`\`\`${message.content}\`\`\``)
			.setColor('FFAE00')
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
					value: `[Posté le ${convertDateForDiscord(message.createdAt)}](${message.url})`,
					inline: true,
				},
				{
					name: '1er signalement',
					value: `Signalement de ${interaction.user} le ${convertDateForDiscord(
						Date.now(),
					)}`,
				},
			])

		// Envoi de l'embed
		await reportChannel.send({ embeds: [sendLogReport] })

		return interaction.editReply({
			content: 'Message signalé 👌',
		})
	},
}
