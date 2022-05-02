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

		if (user.id === interaction.user.id)
			return interaction.reply({
				content: 'Tu ne peux pas lever ton propre bannissement 😕',
				ephemeral: true,
			})

		// Unban du membre
		const unbanAction = await interaction.guild.members.unban(user).catch(error => {
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

		if (unbanAction)
			return interaction.reply({
				content: `🔓 Le bannissement de \`${user}\` a été levé`,
			})
	},
}
