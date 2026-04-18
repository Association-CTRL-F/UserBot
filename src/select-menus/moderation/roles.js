import { EmbedBuilder, MessageFlags } from 'discord.js'
import { displayNameAndID } from '../../util/util.js'

export default {
	data: {
		name: 'roles',
	},
	interaction: async (menu, client) => {
		await menu.deferReply({ flags: MessageFlags.Ephemeral })

		try {
			// Acquisition des rôles à proposer
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

			// Acquisition du membre
			const member = await menu.guild.members.fetch(menu.user.id).catch(() => null)
			if (!member) {
				return menu.editReply({
					content: 'Impossible de récupérer le membre 😕',
				})
			}

			// Acquisition de la raison
			let reason = 'Non précisée'
			for (const [key, entry] of client.cache.staffRolesReason) {
				if (entry.memberId === menu.user.id) {
					reason = entry.reason || 'Non précisée'

					await entry.message?.delete().catch(() => null)
					client.cache.staffRolesReason.delete(key)
				}
			}

			// Acquisition du salon de logs
			const rolesLogs = menu.guild.channels.cache.get(
				client.config.guild.channels.LOGS_ROLES_CHANNEL_ID,
			)

			// Vérification si aucun rôle parmi Modos et Certifiés
			if (!menu.values.includes(modo.id) && !menu.values.includes(certifie.id)) {
				return menu.editReply({
					content:
						'Tu dois sélectionner au minimum le rôle Modos ou le rôle Certifiés 😬',
				})
			}

			// Suppression des rôles actuels
			const rolesRemove = rolesArray.filter((roleId) => member.roles.cache.has(roleId))
			if (rolesRemove.length) {
				await member.roles.remove(rolesRemove)
			}

			// Ajout des rôles choisis
			const rolesAdd = [...new Set(menu.values)]
			if (rolesAdd.length) {
				await member.roles.add(rolesAdd)
			}

			const description =
				rolesAdd.map((roleId) => `- <@&${roleId}>`).join('\n') +
				`\n\n**Raison :** ${reason}`

			// Envoi du message de logs
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
