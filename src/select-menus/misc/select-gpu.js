import fs from 'fs'

export default {
	data: {
		name: 'select-gpu',
	},
	interaction: menu => {
		// Lire le fichier gpu.json qui contient la liste des gpus Nvidia
		let gpusJSON = fs.readFileSync('./config/env/gpu.json', (err, data) => data)
		gpusJSON = JSON.parse(gpusJSON)

		const gpuArray = []

		const member = menu.guild.members.cache.get(menu.user.id)

		// Parcourir les cartes graphiques contenue dans le gpu.json
		Object.values(Object.values(gpusJSON)).forEach(async gpu => {
			await gpuArray.push(gpu.roleId)
		})

		gpuArray.forEach(role => {
			if (member.roles.cache.has(role)) member.roles.remove(role)
		})

		menu.values.forEach(role => {
			member.roles.add(role)
		})

		return menu.reply({ content: 'Les alertes ont bien été définies 👌', ephemeral: true })
	},
}