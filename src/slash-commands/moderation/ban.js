import { SlashCommandBuilder, GuildBan, EmbedBuilder, User, RESTJSONErrorCodes } from 'discord.js'
import { displayNameAndID, convertDateForDiscord, diffDate } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Banni un membre')
		.addStringOption(option =>
			option.setName('membre').setDescription('Discord ID').setRequired(true),
		)
		.addStringOption(option =>
			option.setName('raison').setDescription('Raison du bannissement').setRequired(true),
		)
		.addAttachmentOption(option =>
			option.setName('preuve').setDescription('Preuve du bannissement'),
		)
		.addStringOption(option =>
			option
				.setName('messages')
				.setDescription('Nombre de jours de messages à supprimer (0 à 7 inclus)')
				.addChoices(
					{ name: 'Ne pas supprimer', value: '0' },
					{ name: '1 jour', value: '1' },
					{ name: '2 jours', value: '2' },
					{ name: '3 jours', value: '3' },
					{ name: '4 jours', value: '4' },
					{ name: '5 jours', value: '5' },
					{ name: '6 jours', value: '6' },
					{ name: '7 jours', value: '7' },
				),
		),
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Acquisition du membre
		const user = interaction.options.getString('membre')
		const member = interaction.guild.members.cache.get(user)
		const matchID = user.match(/^(\d{17,19})$/)
		if (!matchID)
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID valide 😕",
				ephemeral: true,
			})

		// On ne peut pas se ban soi-même
		if (user === interaction.user.id)
			return interaction.editReply({
				content: 'Tu ne peux pas te bannir toi-même 😕',
				ephemeral: true,
			})

		// Vérification si le ban existe déjà
		const ban = await interaction.guild.bans.fetch(user).catch(() => false)
		if (ban instanceof GuildBan)
			return interaction.editReply({
				content: 'Cet utilisateur est déjà banni 😕',
				ephemeral: true,
			})

		// Acquisition de la raison du bannissement ainsi que la preuve
		const reason = interaction.options.getString('raison')
		let preuve = ''
		if (interaction.options.getAttachment('preuve'))
			preuve = interaction.options.getAttachment('preuve').attachment
		else preuve = null

		// Acquisition de la base de données UserBot
		const bddUserbot = client.config.db.pools.userbot
		if (!bddUserbot)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données UserBot 😕',
				ephemeral: true,
			})

		// Acquisition de la base de données Moderation
		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Unban 😕',
				ephemeral: true,
			})

		// Acquisition du salon de logs
		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
		)
		if (!logsChannel) return

		// Acquisition du message de bannissement
		let banDM = ''
		try {
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = ['ban']
			const [result] = await bddUserbot.execute(sql, data)

			banDM = result[0].content
		} catch {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du message de bannissement en base de données 😬',
				ephemeral: true,
			})
		}

		// Envoi du message de bannissement en message privé
		let errorDM = ''

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Bannissement')
			.setDescription(banDM)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			})
			.addFields([
				{
					name: 'Raison',
					value: reason,
				},
			])

		let DMMessage = false
		if (member)
			DMMessage = await member
				.send({
					embeds: [embed],
				})
				.catch(error => {
					console.error(error)
					errorDM =
						"\n\nℹ️ Le message privé n'a pas été envoyé car l'utilisateur les a bloqué"
				})

		// Ban du membre
		const banMessagesDays = interaction.options.getString('messages') || 0
		const banAction = await interaction.guild.members
			.ban(user, {
				deleteMessageSeconds: banMessagesDays * 86400,
				reason: `${interaction.user.tag} : ${reason}`,
			})
			.catch(error => {
				// Suppression du message privé envoyé
				// car action de bannissement non réalisée
				if (DMMessage) DMMessage.delete()

				if (error.code === RESTJSONErrorCodes.UnknownUser)
					return interaction.editReply({
						content: "Tu n'as pas donné un ID d'utilisateur 😬",
						ephemeral: true,
					})

				if (error.code === RESTJSONErrorCodes.MissingPermissions)
					return interaction.editReply({
						content: "Tu n'as pas les permissions pour bannir ce membre 😬",
						ephemeral: true,
					})

				console.error(error)
				return interaction.editReply({
					content: 'Une erreur est survenue lors du bannissement du membre 😬',
					ephemeral: true,
				})
			})

		// Si pas d'erreur, message de confirmation du bannissement
		if (banAction instanceof User) {
			await interaction.editReply({
				content: `🔨 \`${
					member ? member.user.tag : user
				}\` a été banni définitivement\n\nRaison : ${reason}${errorDM}${
					preuve ? `\n\nPreuve : <${preuve}>` : ''
				}`,
			})

			const escapedcontent = reason.replace(/```/g, '\\`\\`\\`')

			// Création de l'embed
			const logEmbed = new EmbedBuilder()
				.setColor('C9572A')
				.setAuthor({
					name: displayNameAndID(banAction, banAction),
					iconURL: banAction.displayAvatarURL({ dynamic: true }),
				})
				.setDescription(`\`\`\`\n${interaction.user.tag} : ${escapedcontent}\`\`\``)
				.addFields([
					{
						name: 'Mention',
						value: banAction.toString(),
						inline: true,
					},
					{
						name: 'Date de création du compte',
						value: convertDateForDiscord(banAction.createdAt),
						inline: true,
					},
					{
						name: 'Âge du compte',
						value: diffDate(banAction.createdAt),
						inline: true,
					},
				])
				.setImage(preuve)
				.setFooter({
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					text: `Membre banni par ${interaction.user.tag}`,
				})
				.setTimestamp(new Date())

			// Insertion du nouveau ban en base de données
			try {
				const sql =
					'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
				const data = [
					user,
					member ? member.user.username : user,
					member ? member.user.avatar : null,
					interaction.user.id,
					interaction.user.username,
					reason,
					Math.round(Date.now() / 1000),
				]

				await bddModeration.execute(sql, data)
			} catch (error) {
				console.error(error)
				return interaction.editReply({
					content: 'Une erreur est survenue lors du ban du membre en base de données 😬',
				})
			}

			return logsChannel.send({ embeds: [logEmbed] })
		}

		// Si au moins une erreur, throw
		if (banAction instanceof Error || DMMessage instanceof Error)
			throw new Error(
				"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
			)
	},
}
