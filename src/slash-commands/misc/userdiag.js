import { ContextMenuCommandBuilder } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('userdiag').setType(2),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Acquisition du membre
		const member = interaction.guild.members.cache.get(interaction.targetUser.id)
		if (!member)
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})

		// Acquisition du message
		let userdiagMessage = ''
		try {
			const sqlSelect = 'SELECT content FROM commands WHERE name = ? AND guildId = ?'
			const dataSelect = ['userdiag', interaction.guild.id]
			const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)

			userdiagMessage = resultSelect[0].content
		} catch {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la récupération du message UserDiag 😬',
			})
		}

		// Envoi du message
		return interaction.editReply({
			content: `${member}, suis les instructions ci-dessous :\n\n${userdiagMessage}`,
		})
	},
}
