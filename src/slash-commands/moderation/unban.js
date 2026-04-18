import { SlashCommandBuilder, EmbedBuilder, RESTJSONErrorCodes, MessageFlags } from 'discord.js'
import { convertDateForDiscord, diffDate } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription("Lève le bannissement d'un utilisateur")
		.addStringOption((option) =>
			option.setName('id').setDescription('Discord ID').setRequired(true),
		),

	interaction: async (interaction, client) => {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		// Acquisition de l'utilisateur
		const userId = interaction.options.getString('id').trim()

		// Vérification de l'ID
		if (!/^\d{17,19}$/.test(userId))
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID valide 😕",
			})

		// On ne peut pas s'unban soi-même
		if (userId === interaction.user.id)
			return interaction.editReply({
				content: 'Tu ne peux pas lever ton propre bannissement 😕',
			})

		if (!interaction.guild?.available)
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})

		// Vérification si le ban existe
		const ban = await interaction.guild.bans.fetch(userId).catch((error) => {
			if (error.code === RESTJSONErrorCodes.UnknownBan) return null

			console.error(error)
			return null
		})

		if (!ban)
			return interaction.editReply({
				content: "Cet utilisateur n'est pas banni 😬",
			})

		// Acquisition de la base de données Moderation
		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
			})

		// Acquisition du salon de logs
		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
		)

		// Unban du membre
		let unbanAction = null
		try {
			unbanAction = await interaction.guild.members.unban(userId)
		} catch (error) {
			if (error.code === RESTJSONErrorCodes.MissingPermissions)
				return interaction.editReply({
					content: "Je n'ai pas les permissions pour débannir ce membre 😬",
				})

			if (error.code === RESTJSONErrorCodes.UnknownUser)
				return interaction.editReply({
					content: "Cet utilisateur n'existe pas 😬",
				})

			if (error.code === RESTJSONErrorCodes.UnknownBan)
				return interaction.editReply({
					content: "Ce membre n'est pas banni 😬",
				})

			console.error(error)
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la levée du bannissement de l'utilisateur 😬",
			})
		}

		await interaction.editReply({
			content: `🔓 Le bannissement de \`${unbanAction.tag}\` a été levé`,
		})

		// Suppression du ban en base de données
		try {
			const sql = 'DELETE FROM bans_logs WHERE discord_id = ?'
			const data = [userId]
			await bddModeration.execute(sql, data)
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la levée du ban du membre en base de données 😬',
			})
		}

		// Création de l'embed
		const logEmbed = new EmbedBuilder()
			.setColor('#57C92A')
			.setAuthor({
				name: `${unbanAction.tag} (ID : ${unbanAction.id})`,
				iconURL: unbanAction.displayAvatarURL({ dynamic: true }),
			})
			.addFields(
				{
					name: 'Mention',
					value: unbanAction.toString(),
					inline: true,
				},
				{
					name: 'Date de création du compte',
					value: convertDateForDiscord(unbanAction.createdAt),
					inline: true,
				},
				{
					name: 'Âge du compte',
					value: diffDate(unbanAction.createdAt),
					inline: true,
				},
			)
			.setFooter({
				iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				text: `Membre débanni par ${interaction.user.tag}`,
			})
			.setTimestamp(new Date())

		if (logsChannel?.isTextBased()) {
			await logsChannel.send({ embeds: [logEmbed] }).catch(console.error)
		}
	},
}
