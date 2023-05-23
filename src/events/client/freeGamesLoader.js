/* eslint-disable id-length */
/* eslint-disable no-undefined */
import { readFile, writeFile } from 'fs/promises'
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import axios from 'axios'

export default (guild, client) => {
	// Récupérer les données de l'API toutes les 10 secondes
	setInterval(async () => {
		// Lire le fichier gpu.json qui contient la liste des gpus Nvidia
		let freeGamesJSON = await readFile('./config/env/freeGames.json', (err, data) => data)
		freeGamesJSON = JSON.parse(freeGamesJSON)

		// Acquisition du rôle
		const freeGamesRole = client.config.guild.roles.NOTIF_GAMES_ROLE_ID

		// Acquisition du salon
		const freeGamesChannel = guild.channels.cache.get(
			client.config.guild.channels.FREE_GAMES_CHANNEL_ID,
		)

		// Récupérer les données de l'API
		axios
			.get(
				'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=fr-FR&country=FR&allowCountries=FR',
			)
			.then(res => {
				// regarder si un jeu n'est plus gratuit
				Object.values(freeGamesJSON).forEach(async game => {
					const gameFound = res.data.data.Catalog.searchStore.elements.find(
						g => g.id === game.id,
					)
					if (gameFound === undefined) {
						// Si le jeu n'est pas présent dans la liste
						// des jeux gratuits on le supprime
						delete freeGamesJSON[game.id]
						// On prépare un embed
						const embed = new EmbedBuilder()
							.setTitle(
								`Le jeu ${game.name} n'est plus gratuit sur le Store Epic Games !`,
							)
							.setColor('C9572A')

						// On envoie le message
						await freeGamesChannel.send({ embeds: [embed] })
					}
				})

				// regarder si le jeu se trouve dans le fichier freeGames.json
				res.data.data.Catalog.searchStore.elements.forEach(async game => {
					// if game name = Mystery Game, ignore
					if (game.title === 'Mystery Game') return
					const gameFound = Object.values(freeGamesJSON).find(g => g.id === game.id)
					if (gameFound === undefined) {
						// Si le jeu n'est pas présent
						// dans le fichier on l'ajoute
						freeGamesJSON[game.id] = {
							id: game.id,
							name: game.title,
							url: game.productSlug,
							image: game.keyImages[0].url,
						}
						const row = new ActionRowBuilder().addComponents(
							new ButtonBuilder()
								.setLabel('Acheter')
								.setURL(`https://www.epicgames.com/store/fr/p/${game.productSlug}`)
								.setStyle(ButtonStyle.Link),
						)

						// On prépare un embed
						const embed = new EmbedBuilder()
							.setTitle(`Nouveau jeu gratuit sur le Store Epic Games !`)
							.setColor('57C92A')
							.setImage(game.keyImages[0].url)
							.setDescription(
								`Le jeu **${game.title}** est gratuit sur le Store Epic Games !\n\n> ${game.description}`,
							)

						// On envoie le message
						await freeGamesChannel.send({
							content: `<@&${freeGamesRole}>`,
							embeds: [embed],
							components: [row],
						})
					}
				})
			})
			.catch(() => null)

		// On écrit dans le fichier freeGames.json les nouvelles valeurs
		// après 5 secondes afin de s'assurer que les requêtes d'API
		// aient le temps de s'effectuer
		setTimeout(async () => {
			await writeFile('./config/env/freeGames.json', JSON.stringify(freeGamesJSON, null, 2))
		}, 5000)
	}, 10000)
}
