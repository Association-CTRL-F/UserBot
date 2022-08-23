import { SlashCommandBuilder, User, RESTJSONErrorCodes } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription("Lève le bannissement d'un utilisateur")
		.addStringOption(option =>
			option.setName('id').setDescription('Discord ID').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

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
		if (unbanAction instanceof User)
			return interaction.editReply({
				content: `🔓 Le bannissement de \`${user}\` a été levé`,
			})
	},
}
