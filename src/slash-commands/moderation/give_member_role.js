import { ContextMenuCommandBuilder, ApplicationCommandType, RESTJSONErrorCodes, MessageFlags } from 'discord.js'

export default {
	contextMenu: new ContextMenuCommandBuilder()
		.setName('give_member_role')
		.setType(ApplicationCommandType.User),

	interaction: async (interaction, client) => {
		if (interaction.commandType !== ApplicationCommandType.User) return

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		// Acquisition du rôle membre
		const memberRoleId = client.config.guild.roles.MEMBER_ROLE_ID
		if (!memberRoleId) {
			return interaction.editReply({
				content: 'Le rôle membre n’est pas configuré 😕',
			})
		}

		const memberRole = await interaction.guild.roles.fetch(memberRoleId).catch(() => null)
		if (!memberRole) {
			return interaction.editReply({
				content: 'Impossible de récupérer le rôle membre 😕',
			})
		}

		// Acquisition du membre
		const member = await interaction.guild.members
			.fetch(interaction.targetUser.id)
			.catch(() => null)

		if (!member) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})
		}

		// On ne peut pas ajouter le rôle à un bot
		if (member.user.bot) {
			return interaction.editReply({
				content: 'Tu ne peux pas ajouter le rôle membre à un bot 😕',
			})
		}

		// On ne peut pas s’ajouter le rôle soi-même
		if (member.user.id === interaction.user.id) {
			return interaction.editReply({
				content: "Tu ne peux pas t'ajouter le rôle membre 😕",
			})
		}

		// Évite l'ajout inutile
		if (member.roles.cache.has(memberRole.id)) {
			return interaction.editReply({
				content: `${member} a déjà le rôle membre 😕`,
			})
		}

		try {
			await member.roles.add(memberRole)
		} catch (error) {
			if (error.code === RESTJSONErrorCodes.UnknownMember) {
				return interaction.editReply({
					content: "Je n'ai pas trouvé cet utilisateur 😕",
				})
			}

			console.error(error)
			return interaction.editReply({
				content: 'Une erreur est survenue 😬',
			})
		}

		return interaction.editReply({
			content: `Rôle membre ajouté à ${member} 👌`,
		})
	},
}
