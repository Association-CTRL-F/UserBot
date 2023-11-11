import {
	SlashCommandBuilder,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	RESTJSONErrorCodes,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('upgrade')
		.setDescription("Donne le formulaire d'upgrade")
		.addUserOption(option => option.setName('membre').setDescription('Membre')),
	contextMenu: new ContextMenuCommandBuilder().setName('upgrade').setType(2),
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Acquisition du membre
		let user = {}
		if (interaction.commandType === 2) user = interaction.targetUser
		else user = interaction.options.getUser('membre') || interaction.user

		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})

		if (client.cache.conseilsUsersID.has(`upgrade-${member.user.id}`)) {
			if (member.user === interaction.user)
				return interaction.editReply({
					content:
						"Merci de patienter quelques instants avant d'effectuer à nouveau la commande 😕",
				})

			return interaction.editReply({
				content:
					"Merci de patienter quelques instants avant d'envoyer un nouveau formulaire à cette personne 😕",
			})
		}

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})

		// Acquisition du formulaire
		let upgrade = ''
		let upgradeDescription = ''
		try {
			const sqlSelectUpgrade = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectUpgrade = ['upgrade']
			const [resultSelectUpgrade] = await bdd.execute(sqlSelectUpgrade, dataSelectUpgrade)

			const sqlSelectUpgradeDesc = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectUpgradeDesc = ['upgradeDescription']
			const [resultSelectUpgradeDesc] = await bdd.execute(
				sqlSelectUpgradeDesc,
				dataSelectUpgradeDesc,
			)

			upgrade = resultSelectUpgrade[0].content
			upgradeDescription = resultSelectUpgradeDesc[0].content
		} catch {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du formulaire en base de données 😬',
			})
		}

		// Création de l'embed
		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle("Formulaire d'upgrade")
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			})
			.addFields([
				{
					name: 'Précisions',
					value: upgradeDescription,
				},
			])

		// Acquisition du salon
		const upgradeChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.UPGRADE_CHANNEL_ID,
		)

		// Ajout salon du formulaire si le salon a été trouvé
		if (upgradeChannel)
			embed.data.fields.unshift({
				name: 'Salon dans lequel renvoyer le formulaire complété',
				value: upgradeChannel.toString(),
			})

		// Envoi du formulaire (en deux parties)
		try {
			await member.send({ embeds: [embed] })
			await member.send(upgrade)

			client.cache.conseilsUsersID.add(`upgrade-${member.user.id}`)

			setTimeout(() => {
				client.cache.conseilsUsersID.delete(`upgrade-${member.user.id}`)
			}, 60000)
		} catch (error) {
			if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) throw error

			if (member.user === interaction.user)
				return interaction.editReply({
					content:
						"Je n'ai pas réussi à envoyer le message privé, tu m'as sûrement bloqué / désactivé tes messages provenant du serveur 😬",
				})

			return interaction.editReply({
				content:
					"Je n'ai pas réussi à envoyer le DM, l'utilisateur mentionné m'a sûrement bloqué / désactivé les messages provenant du serveur 😬",
			})
		}

		if (member.user === interaction.user)
			return interaction.editReply({
				content:
					"Formulaire envoyé en message privé 👌\n\n⚠️ Si quelqu'un te MP suite à ta demande, **c'est une arnaque**, ne répond pas et contacte immédiatement un modérateur ⚠️",
			})

		return upgradeChannel
			? interaction.editReply({
					content: `${member}, remplis le formulaire reçu en message privé puis poste le dans ${upgradeChannel} 👌`,
			  })
			: interaction.editReply({
					content: `${member}, remplis le formulaire reçu en message privé 👌\n\n⚠️ Si quelqu'un te MP suite à ta demande, **c'est une arnaque**, ne répond pas et contacte immédiatement un modérateur ⚠️`,
			  })
	},
}
