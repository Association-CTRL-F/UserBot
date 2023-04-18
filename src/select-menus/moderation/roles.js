import { EmbedBuilder } from 'discord.js'
import { displayNameAndID } from '../../util/util.js'

export default {
	data: {
		name: 'roles',
	},
	interaction: async (menu, client) => {
		// Acquisition des rôles à proposer
		const staffEditeurs = await menu.guild.roles.fetch(
			client.config.guild.roles.STAFF_EDITEURS_ROLE_ID,
		)
		const modo = await menu.guild.roles.fetch(client.config.guild.roles.MODO_ROLE_ID)
		const certifie = await menu.guild.roles.fetch(client.config.guild.roles.CERTIF_ROLE_ID)

		const rolesArray = [staffEditeurs.id, modo.id, certifie.id]

		// Acquisition du membre
		const member = menu.guild.members.cache.get(menu.user.id)

		// Acquisition du salon de logs
		const rolesLogs = menu.guild.channels.cache.get(
			client.config.guild.channels.LOGS_ROLES_CHANNEL_ID,
		)

		// Vérification si double rôle
		if (menu.values.includes(modo.id) && menu.values.includes(certifie.id))
			return menu.reply({
				content: 'Tu ne peux pas avoir les rôles Modo et Certifiés en même temps 😬',
				ephemeral: true,
			})

		await rolesArray.forEach(role => {
			if (member.roles.cache.has(role)) member.roles.remove(role)
		})

		let description = ''
		await menu.values.forEach(role => {
			member.roles.add(role)
			description = description.concat(`- <@&${role}>\n`)
		})

		// Envoi du message de logs
		const embed = new EmbedBuilder()
			.setColor('00FF00')
			.setTitle('Rôles modifiés')
			.setDescription(description)
			.setAuthor({
				name: displayNameAndID(menu.member),
				iconURL: menu.user.displayAvatarURL({ dynamic: true }),
			})
			.setTimestamp()

		await rolesLogs.send({ embeds: [embed] })

		return menu.reply({ content: 'Les rôles ont bien été mis à jour 👌', ephemeral: true })
	},
}
