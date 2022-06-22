import { SlashCommandBuilder } from '@discordjs/builders'
import { Constants, MessageEmbed } from 'discord.js'
import { isGuildSetup } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Banni un membre')
		.addStringOption(option =>
			option.setName('membre').setDescription('Discord ID').setRequired(true),
		)
		.addStringOption(option =>
			option.setName('raison').setDescription('Raison du bannissement').setRequired(true),
		)
		.addIntegerOption(option =>
			option
				.setName('messages')
				.setDescription('Nombre de jours de messages à supprimer (0 à 7 inclus)')
				.setMinValue(0)
				.setMaxValue(7),
		),
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
		const user = interaction.options.getString('membre')
		const member = interaction.guild.members.cache.get(user)

		if (user === interaction.user.id)
			// On ne peut pas se ban soi-même
			return interaction.editReply({
				content: 'Tu ne peux pas te bannir toi-même 😕',
				ephemeral: true,
			})

		// Acquisition de la raison du bannissement
		const reason = interaction.options.getString('raison')

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition du message de bannissement
		let banDM = ''
		try {
			const sqlSelectBan = 'SELECT * FROM forms WHERE name = ? AND guildId = ?'
			const dataSelectBan = ['ban', interaction.guild.id]
			const [resultSelectBan] = await bdd.execute(sqlSelectBan, dataSelectBan)

			banDM = resultSelectBan[0].content
		} catch {
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du message de bannissement en base de données 😬',
				ephemeral: true,
			})
		}

		// Envoi du message de bannissement en message privé
		let errorDM = ''

		const embed = new MessageEmbed()
			.setColor('#C27C0E')
			.setTitle('Bannissement')
			.setDescription(banDM)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			})
			.addFields([
				{
					name: 'Raison du bannissement',
					value: reason,
				},
			])

		let DMMessage = {}
		if (member)
			DMMessage = await member
				.send({
					embeds: [embed],
				})
				.catch(error => {
					console.error(error)
					errorDM =
						"\n\nℹ️ Le message privé n'a pas été envoyé car l'utilisateur les a bloqué"
				})

		// Ban du membre
		const banDays = interaction.options.getInteger('messages') || 0
		const banAction = await interaction.guild.members
			.ban(user, { days: banDays, reason: `${interaction.user.tag} : ${reason}` })
			.catch(error => {
				// Suppression du message privé envoyé
				// car action de bannissement non réalisée
				if (DMMessage) DMMessage.delete()

				if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
					return interaction.editReply({
						content: "Tu n'as pas les permissions pour bannir ce membre 😬",
						ephemeral: true,
					})

				console.error(error)
				return interaction.editReply({
					content: 'Une erreur est survenue lors du bannissement du membre 😬',
					ephemeral: true,
				})
			})

		// Si pas d'erreur, message de confirmation du bannissement
		if (banAction)
			return interaction.editReply({
				content: `🔨 \`${
					member ? member.user.tag : user
				}\` a été banni définitivement\n\nRaison : ${reason}${errorDM}`,
			})

		// Si au moins une erreur, throw
		if (banAction instanceof Error || DMMessage instanceof Error)
			throw new Error(
				"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
			)
	},
}
