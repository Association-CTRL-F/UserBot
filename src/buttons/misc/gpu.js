import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'
import fs from 'fs'

export default {
	data: {
		name: 'gpu',
	},
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Lire le fichier gpu.json qui contient la liste des gpus Nvidia
		let gpusJSON = fs.readFileSync('./config/env/gpu.json', (err, data) => data)
		gpusJSON = JSON.parse(gpusJSON)

		const gpuArray = []

		const member = interaction.guild.members.cache.get(interaction.user.id)

		// Parcourir les cartes graphiques contenue dans le gpu.json
		Object.values(Object.values(gpusJSON)).forEach(async gpu => {
			if (member.roles.cache.has(gpu.roleId))
				await gpuArray.push({
					label: gpu.name,
					value: `${gpu.roleId}`,
					default: true,
				})
			else
				await gpuArray.push({
					label: gpu.name,
					value: `${gpu.roleId}`,
					default: false,
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
