import { readFile, writeFile } from 'fs/promises'
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import axios from 'axios'

export default guild => {
	// Récupérer les données de l'API toutes les 10 secondes
	setInterval(async () => {
		// Lire le fichier gpu.json qui contient la liste des gpus Nvidia
		let gpusJSON = await readFile('./config/env/gpu.json', (err, data) => data)
		if (gpusJSON.length === 0) return

		gpusJSON = JSON.parse(gpusJSON)

		// Parcourir les cartes graphiques contenue dans le gpu.json
		// eslint-disable-next-line require-await
		Object.values(Object.values(gpusJSON)).forEach(async gpu => {
			// Récupérer les données de l'API
			axios
				.get(
					`https://api.store.nvidia.com/partner/v1/feinventory?skus=${gpu.code}&locale=fr-fr`,
				)
				.then(async res => {
					// Vérification si la requête retourne des données
					if (res.data.listMap.length === 0) return

					// Si la carte graphique est disponible
					// et qu'annonce non envoyée
					if (res.data.listMap[0].is_active === 'true' && gpu.active !== 'true') {
						// On change la variable active à false
						gpu.active = 'true'

						const role = `<@&${gpu.roleId}>` || ''
						const channel = guild.channels.cache.get(gpu.channelId)

						// On prépare un embed avec un bouton de redirection
						const row = new ActionRowBuilder().addComponents(
							new ButtonBuilder()
								.setLabel('Acheter')
								.setURL(
									`https://store.nvidia.com/fr-fr/geforce/store/?page=1&limit=9&locale=fr-fr&manufacturer=NVIDIA&gpu=${gpu.url}`,
								)
								.setStyle(ButtonStyle.Link),
						)

						const exampleEmbed = new EmbedBuilder()
							.setTitle(`DROP DE ${gpu.name} FE !`)
							.setColor('57C92A')
							.addFields({
								name: 'Prix',
								value: `${res.data.listMap[0].price}€`,
								inline: true,
							})

						// On envoie le message
						await channel.send({
							content: role,
							embeds: [exampleEmbed],
							components: [row],
						})
					}

					if (res.data.listMap[0].is_active === 'false' && gpu.active === 'false') {
						// Si la carte graphique n'est pas disponible
						// et que la variable active est à false
						// on ne fait rien
						// Si besoin on peut écrire quelque chose ici
					}

					// Si la carte graphique n'est pas disponible
					// et que la variable est active
					if (res.data.listMap[0].is_active === 'false' && gpu.active === 'true') {
						// On change la variable active à false
						gpu.active = 'false'

						const channel = guild.channels.cache.get(gpu.channelId)

						// On prépare un embed
						const exampleEmbed = new EmbedBuilder()
							.setTitle(`DROP DE ${gpu.name} FE TERMINÉ !`)
							.setColor('C9572A')

						// On envoie le message
						await channel.send({ embeds: [exampleEmbed] })
					}
				})
				.catch(error => console.error(error))
		})

		// On écrit dans le fichier gpu.json les nouvelles valeurs
		// après 5 secondes afin de s'assurer que les requêtes d'API
		// aient le temps de s'effectuer
		setTimeout(async () => {
			await writeFile('./config/env/gpu.json', JSON.stringify(gpusJSON, null, 2))
		}, 5000)
	}, 10000)
}
