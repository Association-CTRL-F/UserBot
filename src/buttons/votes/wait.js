import { EmbedBuilder } from 'discord.js'

export default {
	data: {
		name: 'wait',
	},
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})

		// Vérification si le membre a déjà voté
		let vote = {}
		try {
			const sql = 'SELECT * FROM votes WHERE memberId = ? AND messageId = ?'
			const data = [interaction.user.id, interaction.message.id]
			const [result] = await bdd.execute(sql, data)
			vote = result[0]
		} catch (error) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la vérification du vote du membre 😕',
				ephemeral: true,
			})
		}

		if (vote) {
			// Modification du vote en base de données
			try {
				const sql =
					'UPDATE votes SET vote = ?, editedAt = ? WHERE messageId = ? AND memberId = ?'

				const data = [
					interaction.customId,
					Math.round(new Date() / 1000),
					interaction.message.id,
					interaction.user.id,
				]

				await bdd.execute(sql, data)
			} catch (error) {
				return interaction.editReply({
					content:
						'Une erreur est survenue lors du ré-enregistrement de ton vote en base de données 😕',
				})
			}

			// Comptage des voix

			// yes
			let nbYes = ''
			try {
				const sql = 'SELECT COUNT(*) AS nbYes FROM votes WHERE messageId = ? AND vote = ?'
				const data = [interaction.message.id, 'yes']

				const [result] = await bdd.execute(sql, data)
				nbYes = [result][0][0].nbYes
			} catch (error) {
				return interaction.editReply({
					content:
						"Une erreur est survenue lors du comptage des voix 'yes' de ton vote en base de données 😕",
				})
			}

			// maybe
			let nbMaybe = ''
			try {
				const sql = 'SELECT COUNT(*) AS nbMaybe FROM votes WHERE messageId = ? AND vote = ?'
				const data = [interaction.message.id, 'maybe']

				const [result] = await bdd.execute(sql, data)
				nbMaybe = [result][0][0].nbMaybe
			} catch (error) {
				return interaction.editReply({
					content:
						"Une erreur est survenue lors du comptage des voix 'maybe' de ton vote en base de données 😕",
				})
			}

			// wait
			let nbWait = ''
			try {
				const sql = 'SELECT COUNT(*) AS nbWait FROM votes WHERE messageId = ? AND vote = ?'
				const data = [interaction.message.id, 'wait']

				const [result] = await bdd.execute(sql, data)
				nbWait = [result][0][0].nbWait
			} catch (error) {
				return interaction.editReply({
					content:
						"Une erreur est survenue lors du comptage des voix 'wait' de ton vote en base de données 😕",
				})
			}

			// no
			let nbNo = ''
			try {
				const sql = 'SELECT COUNT(*) AS nbNo FROM votes WHERE messageId = ? AND vote = ?'
				const data = [interaction.message.id, 'no']

				const [result] = await bdd.execute(sql, data)
				nbNo = [result][0][0].nbNo
			} catch (error) {
				return interaction.editReply({
					content:
						"Une erreur est survenue lors du comptage des voix 'no' de ton vote en base de données 😕",
				})
			}

			// Modification du message
			const embed = new EmbedBuilder()
				.setColor('00FF00')
				.setTitle('Nouveau vote')
				.setDescription(
					`✅ : ${nbYes}
					🤷 : ${nbMaybe}
					⌛ : ${nbWait}
					❌ : ${nbNo}`,
				)
				.addFields([
					{
						name: 'Proposition',
						value: `\`\`\`${interaction.message.embeds[0].data.fields[0].value.slice(
							3,
							-3,
						)}\`\`\``,
					},
				])
				.setAuthor({
					name: interaction.message.embeds[0].data.author.name,
				})
				.setFooter({
					text: interaction.message.embeds[0].data.footer.text,
				})

			embed.data.author.icon_url = interaction.message.embeds[0].data.author.icon_url
			embed.data.author.proxy_icon_url =
				interaction.message.embeds[0].data.author.proxy_icon_url

			await interaction.message.edit({
				embeds: [embed],
			})

			return interaction.editReply({
				content: 'Vote ré-enregistré 👌',
			})
		}

		// Création du vote en base de données
		try {
			const sql =
				'INSERT INTO votes (messageId, memberId, vote, createdAt, editedAt) VALUES (?, ?, ?, ?, ?)'

			const data = [
				interaction.message.id,
				interaction.user.id,
				interaction.customId,
				Math.round(new Date() / 1000),
				null,
			]

			await bdd.execute(sql, data)
		} catch (error) {
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de l'enregistrement de ton vote en base de données 😕",
			})
		}

		// Comptage des voix

		// yes
		let nbYes = ''
		try {
			const sql = 'SELECT COUNT(*) AS nbYes FROM votes WHERE messageId = ? AND vote = ?'
			const data = [interaction.message.id, 'yes']

			const [result] = await bdd.execute(sql, data)
			nbYes = [result][0][0].nbYes
		} catch (error) {
			return interaction.editReply({
				content:
					"Une erreur est survenue lors du comptage des voix 'yes' de ton vote en base de données 😕",
			})
		}

		// maybe
		let nbMaybe = ''
		try {
			const sql = 'SELECT COUNT(*) AS nbMaybe FROM votes WHERE messageId = ? AND vote = ?'
			const data = [interaction.message.id, 'maybe']

			const [result] = await bdd.execute(sql, data)
			nbMaybe = [result][0][0].nbMaybe
		} catch (error) {
			return interaction.editReply({
				content:
					"Une erreur est survenue lors du comptage des voix 'maybe' de ton vote en base de données 😕",
			})
		}

		// wait
		let nbWait = ''
		try {
			const sql = 'SELECT COUNT(*) AS nbWait FROM votes WHERE messageId = ? AND vote = ?'
			const data = [interaction.message.id, 'wait']

			const [result] = await bdd.execute(sql, data)
			nbWait = [result][0][0].nbWait
		} catch (error) {
			return interaction.editReply({
				content:
					"Une erreur est survenue lors du comptage des voix 'wait' de ton vote en base de données 😕",
			})
		}

		// no
		let nbNo = ''
		try {
			const sql = 'SELECT COUNT(*) AS nbNo FROM votes WHERE messageId = ? AND vote = ?'
			const data = [interaction.message.id, 'no']

			const [result] = await bdd.execute(sql, data)
			nbNo = [result][0][0].nbNo
		} catch (error) {
			return interaction.editReply({
				content:
					"Une erreur est survenue lors du comptage des voix 'no' de ton vote en base de données 😕",
			})
		}

		// Modification du message
		const embed = new EmbedBuilder()
			.setColor('00FF00')
			.setTitle('Nouveau vote')
			.setDescription(
				`✅ : ${nbYes}
				🤷 : ${nbMaybe}
				⌛ : ${nbWait}
				❌ : ${nbNo}`,
			)
			.addFields([
				{
					name: 'Proposition',
					value: `\`\`\`${interaction.message.embeds[0].data.fields[0].value.slice(
						3,
						-3,
					)}\`\`\``,
				},
			])
			.setAuthor({
				name: interaction.message.embeds[0].data.author.name,
			})
			.setFooter({
				text: interaction.message.embeds[0].data.footer.text,
			})

		embed.data.author.icon_url = interaction.message.embeds[0].data.author.icon_url
		embed.data.author.proxy_icon_url = interaction.message.embeds[0].data.author.proxy_icon_url

		await interaction.message.edit({
			embeds: [embed],
		})

		return interaction.editReply({
			content: 'Vote enregistré 👌',
		})
	},
}
