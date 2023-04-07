import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js'
import fs from 'fs'

export default {
	data: {
		name: 'gpu',
	},
	interaction: async interaction => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Lire le fichier gpu.json qui contient la liste des gpus Nvidia
		let gpusJSON = fs.readFileSync('./config/env/gpu.json', (err, data) => data)
		gpusJSON = JSON.parse(gpusJSON)

		const gpuArray = []

		const member = interaction.guild.members.cache.get(interaction.user.id)

		// Parcourir les cartes graphiques contenue dans le gpu.json
		Object.values(Object.values(gpusJSON)).forEach(gpu => {
			gpuArray.push({
				label: gpu.name,
				value: gpu.roleId.toString(),
				default: member.roles.cache.has(gpu.roleId),
			})
		})

		const gpuAlertes = new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('select-gpu')
				.setPlaceholder('Sélectionnez vos alertes')
				.setMinValues(0)
				.setMaxValues(gpuArray.length)
				.addOptions(gpuArray),
		)

		return interaction.editReply({
			components: [gpuAlertes],
		})
	},
}
