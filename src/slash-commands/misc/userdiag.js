import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js'

export default {
	contextMenu: new ContextMenuCommandBuilder()
		.setName('userdiag')
		.setType(ApplicationCommandType.User),

	interaction: async (interaction, client) => {
		await interaction.deferReply()

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		// Acquisition du membre
		const member = await interaction.guild.members
			.fetch(interaction.targetUser.id)
			.catch(() => null)

		if (!member) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})
		}

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Acquisition du message
		let userdiagMessage = ''
		try {
			const sql = 'SELECT content FROM commands WHERE name = ?'
			const data = ['userdiag']
			const [result] = await bdd.execute(sql, data)

			userdiagMessage = result?.[0]?.content ?? ''
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du message UserDiag en base de données 😬',
			})
		}

		if (!userdiagMessage) {
			return interaction.editReply({
				content: 'Le message UserDiag est introuvable ou vide 😕',
			})
		}

		// Envoi du message
		return interaction.editReply({
			content: `${member}, suis les instructions ci-dessous :\n\n${userdiagMessage}`,
		})
	},
}
