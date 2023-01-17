import { SlashCommandBuilder, EmbedBuilder, User, RESTJSONErrorCodes } from 'discord.js'
import { displayNameAndID, convertDateForDiscord, diffDate } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription("Lève le bannissement d'un utilisateur")
		.addStringOption(option =>
			option.setName('id').setDescription('Discord ID').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Acquisition de l'utilisateur
		const user = interaction.options.getString('id')

		// On ne peut pas s'unban soi-même
		if (user.id === interaction.user.id)
			return interaction.editReply({
				content: 'Tu ne peux pas lever ton propre bannissement 😕',
				ephemeral: true,
			})

		// Vérification si le ban existe déjà
		const ban = await interaction.guild.bans.fetch(user).catch(error => console.log(error))
		if (!ban)
			return interaction.editReply({
				content: "Cet utilisateur n'est pas banni 😬",
				ephemeral: true,
			})

		// Acquisition du salon de logs
		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
		)
		if (!logsChannel) return

		// Unban du membre
		const unbanAction = await interaction.guild.members.unban(user).catch(error => {
			if (error.code === RESTJSONErrorCodes.MissingPermissions)
				return interaction.editReply({
					content: "Je n'ai pas les permissions pour bannir ce membre 😬",
					ephemeral: true,
				})

			if (error.code === RESTJSONErrorCodes.UnknownUser)
				return interaction.editReply({
					content: "Cet utilisateur n'existe pas 😬",
					ephemeral: true,
				})

			if (error.code === RESTJSONErrorCodes.UnknownBan)
				return interaction.editReply({
					content: "Ce membre n'est pas banni 😬",
					ephemeral: true,
				})

			console.error(error)
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la levée du bannissement de l'utilisateur 😬",
				ephemeral: true,
			})
		})

		// Si pas d'erreur, message de confirmation d'unban
		if (unbanAction instanceof User) {
			await interaction.editReply({
				content: `🔓 Le bannissement de \`${user}\` a été levé`,
			})

			// Création de l'embed
			const logEmbed = new EmbedBuilder()
				.setColor('57C92A')
				.setAuthor({
					name: displayNameAndID(unbanAction, unbanAction),
					iconURL: unbanAction.displayAvatarURL({ dynamic: true }),
				})
				.addFields([
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
				])
				.setFooter({
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					text: `Membre débanni par ${interaction.user.tag}`,
				})
				.setTimestamp(new Date())

			return logsChannel.send({ embeds: [logEmbed] })
		}
	},
}
