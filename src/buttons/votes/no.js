import { EmbedBuilder, MessageFlags } from 'discord.js'

const countVotes = async (bdd, messageId, voteName, alias) => {
	const sql = `SELECT COUNT(*) AS ${alias} FROM votes WHERE messageId = ? AND vote = ?`
	const data = [messageId, voteName]
	const [result] = await bdd.execute(sql, data)
	return result[0][alias]
}

const buildUpdatedEmbed = (interaction, nbYes, nbWait, nbNo) => {
	const sourceEmbed = interaction.message.embeds[0]
	const baseEmbed = sourceEmbed ? EmbedBuilder.from(sourceEmbed) : new EmbedBuilder()

	const originalProposal =
		sourceEmbed?.fields?.find((field) => field.name === 'Proposition')?.value ??
		'```Aucune proposition```'

	return baseEmbed
		.setColor(0x00ff00)
		.setDescription(`✅ : ${nbYes}\n⌛ : ${nbWait}\n❌ : ${nbNo}`)
		.setFields({
			name: 'Proposition',
			value: originalProposal,
		})
}

export default {
	data: {
		name: 'no',
	},
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		if (!interaction.message?.id) {
			return interaction.editReply({
				content: 'Impossible de retrouver le message du vote 😕',
			})
		}

		if (!interaction.message.embeds?.length) {
			return interaction.editReply({
				content: "Impossible de retrouver l'embed du vote 😕",
			})
		}

		// Vérification si le membre a déjà voté
		let vote = null
		try {
			const sql = 'SELECT * FROM votes WHERE memberId = ? AND messageId = ?'
			const data = [interaction.user.id, interaction.message.id]
			const [result] = await bdd.execute(sql, data)
			vote = result[0] ?? null
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la vérification du vote du membre 😕',
			})
		}

		// Création ou modification du vote en base de données
		try {
			if (vote) {
				const sql =
					'UPDATE votes SET vote = ?, editedAt = ? WHERE messageId = ? AND memberId = ?'
				const data = [
					interaction.customId,
					Math.round(Date.now() / 1000),
					interaction.message.id,
					interaction.user.id,
				]

				await bdd.execute(sql, data)
			} else {
				const sql =
					'INSERT INTO votes (messageId, memberId, vote, createdAt, editedAt) VALUES (?, ?, ?, ?, ?)'
				const data = [
					interaction.message.id,
					interaction.user.id,
					interaction.customId,
					Math.round(Date.now() / 1000),
					null,
				]

				await bdd.execute(sql, data)
			}
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content: vote
					? 'Une erreur est survenue lors du ré-enregistrement de ton vote en base de données 😕'
					: "Une erreur est survenue lors de l'enregistrement de ton vote en base de données 😕",
			})
		}

		// Comptage des voix
		let nbYes = 0
		let nbWait = 0
		let nbNo = 0

		try {
			;[nbYes, nbWait, nbNo] = await Promise.all([
				countVotes(bdd, interaction.message.id, 'yes', 'nbYes'),
				countVotes(bdd, interaction.message.id, 'wait', 'nbWait'),
				countVotes(bdd, interaction.message.id, 'no', 'nbNo'),
			])
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors du comptage des voix du vote en base de données 😕',
			})
		}

		// Modification du message
		try {
			const embed = buildUpdatedEmbed(interaction, nbYes, nbWait, nbNo)

			await interaction.message.edit({
				embeds: [embed],
			})
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la mise à jour du message de vote 😕',
			})
		}

		return interaction.editReply({
			content: vote ? 'Vote ré-enregistré 👌' : 'Vote enregistré 👌',
		})
	},
}
