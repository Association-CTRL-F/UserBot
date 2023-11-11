import {
	SlashCommandBuilder,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	RESTJSONErrorCodes,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Donne le formulaire de config')
		.addUserOption(option => option.setName('membre').setDescription('Membre')),
	contextMenu: new ContextMenuCommandBuilder().setName('config').setType(2),
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

		if (client.cache.conseilsUsersID.has(`config-${member.user.id}`)) {
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
		let config = ''
		let configDescription = ''
		try {
			const sqlSelectConfig = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectConfig = ['config']
			const [resultSelectConfig] = await bdd.execute(sqlSelectConfig, dataSelectConfig)

			const sqlSelectConfigDesc = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectConfigDesc = ['configDescription']
			const [resultSelectConfigDesc] = await bdd.execute(
				sqlSelectConfigDesc,
				dataSelectConfigDesc,
			)

			config = resultSelectConfig[0].content
			configDescription = resultSelectConfigDesc[0].content
		} catch {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du formulaire en base de données 😬',
			})
		}

		// Création de l'embed
		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Formulaire de config')
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			})
			.addFields([
				{
					name: 'Précisions',
					value: configDescription,
				},
			])

		// Acquisition du salon
		const configChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.CONFIG_CHANNEL_ID,
		)

		// Ajout salon du formulaire si le salon a été trouvé
		if (configChannel)
			embed.data.fields.unshift({
				name: 'Salon dans lequel renvoyer le formulaire complété',
				value: configChannel.toString(),
			})

		// Envoi du formulaire (en deux parties)
		try {
			await member.send({ embeds: [embed] })
			await member.send(config)

			client.cache.conseilsUsersID.add(`config-${member.user.id}`)

			setTimeout(() => {
				client.cache.conseilsUsersID.delete(`config-${member.user.id}`)
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

		return configChannel
			? interaction.editReply({
					content: `${member}, remplis le formulaire reçu en message privé puis poste le dans ${configChannel} 👌\n\n⚠️ Si quelqu'un te MP suite à ta demande, **c'est une arnaque**, ne répond pas et contacte immédiatement un modérateur ⚠️`,
			  })
			: interaction.editReply({
					content: `${member}, remplis le formulaire reçu en message privé 👌\n\n⚠️ Si quelqu'un te MP suite à ta demande, **c'est une arnaque**, ne répond pas et contacte immédiatement un modérateur ⚠️`,
			  })
	},
}
