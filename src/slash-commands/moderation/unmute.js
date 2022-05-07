import { SlashCommandBuilder } from '@discordjs/builders'
import { Constants, GuildMember } from 'discord.js'
import { db } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('unmute')
		.setDescription('Unmute un membre')
		.addUserOption(option =>
			option.setName('membre').setDescription('Membre').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// Acquisition du membre
		const user = interaction.options.getUser('membre')
		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.reply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				ephemeral: true,
			})

		// Acquisition du rôle muted
		const mutedRole = client.config.mutedRoleID
		if (!mutedRole)
			return interaction.reply({
				content: "Il n'y a pas de rôle Muted 😕",
				ephemeral: true,
			})

		// Vérification si le membre a bien le rôle muted
		if (!member.roles.cache.has(mutedRole))
			return interaction.reply({
				content: "Le membre n'est pas muté 😕",
				ephemeral: true,
			})

		// On ne peut pas se démute soi-même
		if (member.id === interaction.user.id)
			return interaction.reply({
				content: 'Tu ne peux pas te démute toi-même 😕',
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition du message d'unmute
		let unmuteDM = ''
		try {
			const sqlSelectUnmute = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectUnmute = ['unmute']
			const [resultSelectUnmute] = await bdd.execute(sqlSelectUnmute, dataSelectUnmute)

			unmuteDM = resultSelectUnmute[0].content
		} catch (error) {
			console.error(error)
			return interaction.reply({
				content:
					"Une erreur est survenue lors de la récupération du message d'unmute en base de données 😬",
				ephemeral: true,
			})
		}

		// Envoi du message d'unmute en message privé
		const DMMessage = await member
			.send({
				embeds: [
					{
						color: '#C27C0E',
						title: 'Mute terminé',
						description: unmuteDM,
						author: {
							name: interaction.guild.name,
							icon_url: interaction.guild.iconURL({ dynamic: true }),
							url: interaction.guild.vanityURL,
						},
					},
				],
			})
			.catch(error => {
				console.error(error)
			})

		// Vérification si déjà mute en base de données
		let mutedMember = {}
		try {
			const sqlCheck = 'SELECT * FROM mute WHERE discordID = ?'
			const dataCheck = [member.id]
			const [resultCheck] = await bdd.execute(sqlCheck, dataCheck)

			mutedMember = resultCheck[0]
		} catch (error) {
			console.error(error)
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la levé du mute du membre en base de données 😬',
				ephemeral: true,
			})
		}

		// Si oui alors on lève le mute en base de données
		if (mutedMember) {
			try {
				const sqlDelete = 'DELETE FROM mute WHERE discordID = ?'
				const dataDelete = [member.id]
				await bdd.execute(sqlDelete, dataDelete)
			} catch {
				if (DMMessage) DMMessage.delete()
				return interaction.reply({
					content:
						'Une erreur est survenue lors de la levée du mute du membre en base de données 😬',
					ephemeral: true,
				})
			}

			// Action d'unmute du membre
			const unmuteAction = await member.roles.remove(mutedRole).catch(error => {
				// Suppression du message privé envoyé
				// car action de mute non réalisée
				if (DMMessage) DMMessage.delete()

				// Réinsertion du mute en base de données
				try {
					const sql =
						'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
					const data = [
						mutedMember.discordID,
						mutedMember.timestampStart,
						mutedMember.timestampEnd,
					]

					bdd.execute(sql, data)
				} catch {
					return interaction.reply({
						content: 'Une erreur est survenue lors de la levée du mute du membre 😬',
						ephemeral: true,
					})
				}

				if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
					return interaction.reply({
						content: "Je n'ai pas les permissions pour unmute ce membre 😬",
						ephemeral: true,
					})

				console.error(error)
				return interaction.reply({
					content: 'Une erreur est survenue lors de la levée du mute du membre 😬',
					ephemeral: true,
				})
			})

			// Si pas d'erreur, message de confirmation de l'unmute
			if (unmuteAction instanceof GuildMember)
				return interaction.reply({
					content: `🔊 \`${member.user.tag}\` est démuté`,
				})

			// Si au moins une erreur, throw
			if (unmuteAction instanceof Error || DMMessage instanceof Error)
				throw new Error(
					"L'envoi d'un message et / ou l'unmute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
				)
		}
	},
}
