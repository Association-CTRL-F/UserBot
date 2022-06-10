import { Constants } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

export default {
	data: new SlashCommandBuilder()
		.setName('upgrade')
		.setDescription("Donne le formulaire d'upgrade")
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
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
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
			return interaction.reply({
				content: 'Une erreur est survenue lors de la récupération du formulaire 😬',
				ephemeral: true,
			})
		}

		// Création de l'embed
		const embed = {
			color: '#C27C0E',
			title: "Formulaire d'upgrade",
			author: {
				name: interaction.guild.name,
				icon_url: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			},
			fields: [
				{
					name: 'Précisions',
					value: upgradeDescription,
				},
			],
		}

		// Acquisition du salon
		const upgradeChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.upgradeChannelID,
		)

		// Ajout salon du formulaire si le salon a été trouvé
		if (upgradeChannel)
			embed.fields.unshift({
				name: 'Salon dans lequel renvoyer le formulaire complété',
				value: upgradeChannel.toString(),
			})

		// Envoi du formulaire (en deux parties)
		try {
			await member.send({ embeds: [embed] })
			await member.send(upgrade)
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

		return upgradeChannel
			? interaction.reply({
					content: `${member}, remplis le formulaire reçu en message privé puis poste le dans ${upgradeChannel} 👌`,
			  })
			: interaction.reply({
					content: `${member}, remplis le formulaire reçu en message privé 👌`,
			  })
	},
}
