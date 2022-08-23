import { SlashCommandBuilder, ContextMenuCommandBuilder, Constants, EmbedBuilder } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Donne le formulaire de config')
		.addUserOption(option => option.setName('membre').setDescription('Membre')),
	contextMenu: new ContextMenuCommandBuilder().setName('config').setType(2),
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
		let user = {}
		if (interaction.commandType === 2) user = interaction.targetUser
		else user = interaction.options.getUser('membre') || interaction.user

		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition des paramètres de la guild
		let configGuild = {}
		try {
			const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
			const dataSelect = [interaction.guild.id]
			const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
			configGuild = resultSelect[0]
		} catch (error) {
			return console.log(error)
		}

		// Acquisition du formulaire
		let config = ''
		let configDescription = ''
		try {
			const sqlSelectConfig = 'SELECT * FROM forms WHERE name = ? AND guildId = ?'
			const dataSelectConfig = ['config', interaction.guild.id]
			const [resultSelectConfig] = await bdd.execute(sqlSelectConfig, dataSelectConfig)

			const sqlSelectConfigDesc = 'SELECT * FROM forms WHERE name = ? AND guildId = ?'
			const dataSelectConfigDesc = ['configDescription', interaction.guild.id]
			const [resultSelectConfigDesc] = await bdd.execute(
				sqlSelectConfigDesc,
				dataSelectConfigDesc,
			)

			config = resultSelectConfig[0].content
			configDescription = resultSelectConfigDesc[0].content
		} catch {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la récupération du formulaire 😬',
				ephemeral: true,
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
		const configChannel = interaction.guild.channels.cache.get(configGuild.CONFIG_CHANNEL_ID)

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
		} catch (error) {
			if (error.code !== Constants.APIErrors.CANNOT_MESSAGE_USER) throw error

			if (member.user === interaction.user)
				return interaction.editReply({
					content:
						"Je n'ai pas réussi à envoyer le message privé, tu m'as sûrement bloqué / désactivé tes messages provenant du serveur 😬",
					ephemeral: true,
				})

			return interaction.editReply({
				content:
					"Je n'ai pas réussi à envoyer le DM, l'utilisateur mentionné m'a sûrement bloqué / désactivé les messages provenant du serveur 😬",
				ephemeral: true,
			})
		}

		if (member.user === interaction.user)
			return interaction.editReply({
				content: 'Formulaire envoyé en message privé 👌',
				ephemeral: true,
			})

		return configChannel
			? interaction.editReply({
					content: `${member}, remplis le formulaire reçu en message privé puis poste le dans ${configChannel} 👌`,
			  })
			: interaction.editReply({
					content: `${member}, remplis le formulaire reçu en message privé 👌`,
			  })
	},
}
