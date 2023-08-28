import { ContextMenuCommandBuilder, RESTJSONErrorCodes } from 'discord.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('give_member_role').setType(2),
	interaction: async (interaction, client) => {
		if (!interaction.commandType === 2) return

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Acquisition du rôle membre
		const memberRole = client.config.guild.roles.MEMBER_ROLE_ID

		// Acquisition du membre
		const member = interaction.guild.members.cache.get(interaction.targetUser.id)
		if (!member)
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})

		// On ne peut pas ajouter le rôle à un bot
		if (member.user.bot)
			return interaction.editReply({
				content: 'Tu ne peux pas ajouter le rôle membre à un bot 😕',
			})

		// On ne peut pas définir hors-sujet son propre message
		if (member.user === interaction.user)
			return interaction.editReply({
				content: "Tu ne peux pas t'ajouter le rôle membre 😕",
			})

		await member.roles.add(memberRole).catch(error => {
			if (error.code !== RESTJSONErrorCodes.UnknownMember)
				return interaction.editReply({
					content: 'Une erreur est survenue 😬',
				})
		})

		return interaction.editReply({
			content: `Rôle membre ajouté à ${member} 👌`,
		})
	},
}
