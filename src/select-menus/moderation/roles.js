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

		await rolesArray.forEach(role => {
			if (member.roles.cache.has(role)) member.roles.remove(role)
		})

		await menu.values.forEach(role => {
			member.roles.add(role)
		})

		return menu.reply({ content: 'Les rôles ont bien été mis à jour 👌', ephemeral: true })
	},
}
