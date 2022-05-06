import { SlashCommandBuilder } from '@discordjs/builders'
import { Constants, GuildMember } from 'discord.js'
import { db } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Banni un membre')
		.addUserOption(option =>
			option.setName('membre').setDescription('Membre').setRequired(true),
		)
		.addStringOption(option =>
			option.setName('raison').setDescription('Raison du bannissement').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// Acquisition du membre et de la raison du bannissement
		const user = interaction.options.getUser('membre')
		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.reply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				ephemeral: true,
			})

		// On ne peut pas se ban soi-même
		if (member.id === interaction.user.id)
			return interaction.reply({
				content: 'Tu ne peux pas te bannir toi-même 😕',
				ephemeral: true,
			})

		// Acquisition de la raison du bannissement
		const reason = interaction.options.getString('raison')

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		try {
			const sqlSelectBan = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectBan = ['ban']
			const [resultSelectBan] = await bdd.execute(sqlSelectBan, dataSelectBan)

			const banDM = resultSelectBan[0].content

			// Envoi du message de bannissement en message privé
			const DMMessage = await member
				.send({
					embeds: [
						{
							color: '#C27C0E',
							title: 'Bannissement',
							description: banDM,
							author: {
								name: interaction.guild.name,
								icon_url: interaction.guild.iconURL({ dynamic: true }),
								url: interaction.guild.vanityURL,
							},
							fields: [
								{
									name: 'Raison du bannissement',
									value: reason,
								},
							],
						},
					],
				})
				.catch(error => {
					console.error(error)
				})

			// Ban du membre
			const banAction = await member
				.ban({ days: 7, reason: `${interaction.user.tag}: ${reason}` })
				.catch(error => {
					// Suppression du message privé envoyé
					// car action de bannissement non réalisée
					if (DMMessage) DMMessage.delete()

					if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
						return interaction.reply({
							content: "Tu n'as pas les permissions pour bannir ce membre 😬",
							ephemeral: true,
						})

					console.error(error)
					return interaction.reply({
						content: 'Une erreur est survenue lors du bannissement du membre 😬',
						ephemeral: true,
					})
				})

			// Si pas d'erreur, message de confirmation du bannissement
			if (banAction instanceof GuildMember)
				return interaction.reply({
					content: `🔨 \`${member.user.tag}\` a été définitivement banni`,
				})

			// Si au moins une erreur, throw
			if (banAction instanceof Error || DMMessage instanceof Error)
				throw new Error(
					"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
				)
		} catch {
			return interaction.reply({
				content: 'Une erreur est survenue lors du bannissement du membre 😬',
				ephemeral: true,
			})
		}
	},
}
