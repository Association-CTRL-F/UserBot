import { Constants } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { db } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Donne le formulaire de config')
		.addUserOption(option => option.setName('membre').setDescription('Membre')),
	interaction: async (interaction, client) => {
		// Acquisition du membre
		const user = interaction.options.getUser('membre') || interaction.user
		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.reply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

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

			const config = resultSelectConfig[0].content
			const configDescription = resultSelectConfigDesc[0].content

			// Création de l'embed
			const embed = {
				color: '#C27C0E',
				title: 'Formulaire config',
				author: {
					name: interaction.guild.name,
					icon_url: interaction.guild.iconURL({ dynamic: true }),
					url: interaction.guild.vanityURL,
				},
				fields: [
					{
						name: 'Précisions',
						value: configDescription,
					},
				],
			}

			// Acquisition du salon
			const configChannel = interaction.guild.channels.cache.get(
				client.config.configChannelID,
			)

			// Ajout salon du formulaire si le salon a été trouvé
			if (configChannel)
				embed.fields.unshift({
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
					return interaction.reply({
						content:
							"Je n'ai pas réussi à envoyer le message privé, tu m'as sûrement bloqué / désactivé tes messages provenant du serveur 😬",
						ephemeral: true,
					})

				return interaction.reply({
					content:
						"Je n'ai pas réussi à envoyer le DM, l'utilisateur mentionné m'a sûrement bloqué / désactivé les messages provenant du serveur 😬",
					ephemeral: true,
				})
			}

			if (member.user === interaction.user)
				return interaction.reply({
					content: 'Formulaire envoyé en message privé 👌',
					ephemeral: true,
				})

			return configChannel
				? interaction.reply({
						content: `${member}, remplis le formulaire reçu en message privé puis poste le dans ${configChannel} 👌`,
				  })
				: interaction.reply({
						content: `${member}, remplis le formulaire reçu en message privé 👌`,
				  })
		} catch {
			return interaction.reply({
				content: "Une erreur est survenue lors de l'envoi du formulaire 😬",
				ephemeral: true,
			})
		}
	},
}
