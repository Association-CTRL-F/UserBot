import { SlashCommandBuilder } from '@discordjs/builders'
import { Constants } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription("Lève le bannissement d'un utilisateur")
		.addStringOption(option =>
			option.setName('id').setDescription('Discord ID').setRequired(true),
		),
	interaction: async interaction => {
		// Acquisition de l'utilisateur
		const user = interaction.options.getString('id')

		// On ne peut pas s'unban soi-même
		if (user.id === interaction.user.id)
			return interaction.reply({
				content: 'Tu ne peux pas lever ton propre bannissement 😕',
				ephemeral: true,
			})

		// Unban du membre
		const unbanAction = await interaction.guild.members.unban(user).catch(error => {
			if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
				return interaction.reply({
					content: "Je n'ai pas les permissions pour bannir ce membre 😬",
					ephemeral: true,
				})

			if (error.code === Constants.APIErrors.UNKNOWN_USER)
				return interaction.reply({
					content: "Cet utilisateur n'existe pas 😬",
					ephemeral: true,
				})

			if (error.code === Constants.APIErrors.UNKNOWN_BAN)
				return interaction.reply({
					content: "Ce membre n'est pas banni 😬",
					ephemeral: true,
				})

			console.error(error)
			return interaction.reply({
				content:
					"Une erreur est survenue lors de la levée du bannissement de l'utilisateur 😬",
				ephemeral: true,
			})
		})

		// Si pas d'erreur, message de confirmation d'unban
		if (unbanAction) {
			await interaction.deferReply()
			return interaction.editReply({
				content: `🔓 Le bannissement de \`${user}\` a été levé`,
			})
		}
	},
}
