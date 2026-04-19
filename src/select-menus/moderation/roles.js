import { EmbedBuilder } from 'discord.js'
import { displayNameAndID } from '../../util/util.js'

export default {
	data: {
		name: 'roles',
	},
	interaction: async (menu, client) => {
		await menu.deferReply()

		try {
			const [staffEditeurs, modo, certifie] = await Promise.all([
				menu.guild.roles.fetch(client.config.guild.roles.STAFF_EDITEURS_ROLE_ID),
				menu.guild.roles.fetch(client.config.guild.roles.MODO_ROLE_ID),
				menu.guild.roles.fetch(client.config.guild.roles.CERTIF_ROLE_ID),
			])

			if (!staffEditeurs || !modo || !certifie) {
				return menu.editReply({
					content: 'Impossible de récupérer un ou plusieurs rôles 😕',
				})
			}

			const rolesArray = [staffEditeurs.id, modo.id, certifie.id]

			const member = await menu.guild.members.fetch(menu.user.id).catch(() => null)
			if (!member) {
				return menu.editReply({
					content: 'Impossible de récupérer le membre 😕',
				})
			}

			if (!(client.cache.staffRolesReason instanceof Map)) {
				client.cache.staffRolesReason = new Map()
			}

			let reason = 'Non précisée'
			const staffRoleEntry = client.cache.staffRolesReason.get(menu.user.id)

			if (staffRoleEntry) {
				reason = staffRoleEntry.reason || 'Non précisée'

				await staffRoleEntry.interaction?.deleteReply().catch(() => null)
				client.cache.staffRolesReason.delete(menu.user.id)
			}

			const rolesLogs = menu.guild.channels.cache.get(
				client.config.guild.channels.LOGS_ROLES_CHANNEL_ID,
			)

			if (!menu.values.includes(modo.id) && !menu.values.includes(certifie.id)) {
				return menu.editReply({
					content:
						'Tu dois sélectionner au minimum le rôle Modos ou le rôle Certifiés 😬',
				})
			}

			const rolesRemove = rolesArray.filter((roleId) => member.roles.cache.has(roleId))
			if (rolesRemove.length) {
				await member.roles.remove(rolesRemove)
			}

			const rolesAdd = [...new Set(menu.values)]
			if (rolesAdd.length) {
				await member.roles.add(rolesAdd)
			}

			const description = `${rolesAdd
				.map((roleId) => `- <@&${roleId}>`)
				.join('\n')}\n\n**Raison :** ${reason}`

			if (rolesLogs?.isTextBased()) {
				const embed = new EmbedBuilder()
					.setColor(0x00ff00)
					.setTitle('Rôles modifiés')
					.setDescription(description)
					.setAuthor({
						name: displayNameAndID(menu.member, menu.user),
						iconURL: menu.user.displayAvatarURL({ dynamic: true }),
					})
					.setTimestamp()

				await rolesLogs.send({ embeds: [embed] }).catch(console.error)
			}

			return menu.editReply({
				content: 'Les rôles ont bien été mis à jour 👌',
			})
		} catch (error) {
			console.error(error)
			return menu.editReply({
				content: 'Une erreur est survenue lors de la mise à jour des rôles 😕',
			})
		}
	},
}
