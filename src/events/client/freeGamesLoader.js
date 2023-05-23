/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable id-length */

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
		try {
			axios
				.get(
					'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=fr-FR&country=FR&allowCountries=FR',
				)
				.then(async res => {
					// regarder si un jeu n'est plus gratuit
					for (let i = 0; i < freeGamesJSON.length; i++) {
						const game = freeGamesJSON[i]
						let gameFound = false
						for (let j = 0; j < res.data.data.Catalog.searchStore.elements.length; j++)
							if (game.id === res.data.data.Catalog.searchStore.elements[j].id) {
								gameFound = true
								break
							}

						if (!gameFound) {
							freeGamesJSON.splice(i, 1)
							// On prépare un embed
							const embed = new EmbedBuilder()
								.setTitle(
									`Le jeu ${game.title} n'est plus gratuit sur le Store Epic Games !`,
								)
								.setColor('C9572A')

							// On envoie le message
							await freeGamesChannel.send({ embeds: [embed] })
						}
					}

					for (let i = 0; i < res.data.data.Catalog.searchStore.elements.length; i++) {
						const game = res.data.data.Catalog.searchStore.elements[i]
						let gameFound = false
						for (let j = 0; j < freeGamesJSON.length; j++)
							if (game.id === freeGamesJSON[j].id) {
								gameFound = true
								break
							}

						if (!gameFound) {
							if (game.title === 'Mystery Game') continue
							freeGamesJSON.push({
								id: game.id,
								title: game.title,
								description: game.description,
								image: game.keyImages[0].url,
								url: `https://www.epicgames.com/store/fr/p/${game.productSlug}`,
							})

							const row = new ActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setLabel('Acheter')
									.setURL(
										`https://www.epicgames.com/store/fr/p/${game.productSlug}`,
									)
									.setStyle(ButtonStyle.Link),
							)

							// On prépare un embed
							const embed = new EmbedBuilder()
								.setTitle(`**${game.title}** est gratuit sur le Store Epic Games !`)
								.setColor('57C92A')
								.setImage(game.keyImages[0].url)
								.setURL(`https://www.epicgames.com/store/fr/p/${game.productSlug}`)
								.setDescription(`> ${game.description}`)

							// On envoie le message
							await freeGamesChannel.send({
								content: `<@&${freeGamesRole}>`,
								embeds: [embed],
								components: [row],
							})

							gameFound = false
						}
					}

					await writeFile(
						'./config/env/freeGames.json',
						JSON.stringify(freeGamesJSON, null, 2),
					)
				})
		} catch (err) {
			console.log(`Erreur lors de la récupération des données de l'API : ${err}`)
		}
	}, 10000)
}
