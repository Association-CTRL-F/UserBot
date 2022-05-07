/* eslint-disable no-mixed-operators */
import { SlashCommandBuilder } from '@discordjs/builders'
import { Constants, GuildMember } from 'discord.js'
import { db, convertMinutesToString } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Mute un membre')
		.addUserOption(option =>
			option.setName('membre').setDescription('Membre').setRequired(true),
		)
		.addStringOption(option =>
			option.setName('raison').setDescription('Raison du mute').setRequired(true),
		)
		.addIntegerOption(option =>
			option.setName('durée').setDescription('Durée du mute en minutes').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// Acquisition du membre, de la raison du mute et de sa durée
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

		// Vérification si le membre a déjà le rôle muted
		if (member.roles.cache.has(mutedRole))
			return interaction.reply({
				content: 'Le membre est déjà muté 😕',
				ephemeral: true,
			})

		// On ne peut pas se mute soi-même
		if (member.id === interaction.user.id)
			return interaction.reply({
				content: 'Tu ne peux pas te mute toi-même 😕',
				ephemeral: true,
			})

		// Acquisition de la raison et la durée du mute
		const reason = interaction.options.getString('raison')
		const duration = interaction.options.getInteger('durée')

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition du message de mute
		let muteDM = ''
		try {
			const sqlSelectMute = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectMute = ['mute']
			const [resultSelectMute] = await bdd.execute(sqlSelectMute, dataSelectMute)

			muteDM = resultSelectMute[0].content
		} catch {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la récupération du message de mute en base de données 😬',
				ephemeral: true,
			})
		}

		// Envoi du message de mute en message privé
		const DMMessage = await member
			.send({
				embeds: [
					{
						color: '#C27C0E',
						title: 'Mute',
						description: muteDM,
						author: {
							name: interaction.guild.name,
							icon_url: interaction.guild.iconURL({ dynamic: true }),
							url: interaction.guild.vanityURL,
						},
						fields: [
							{
								name: 'Raison du mute',
								value: reason,
							},
							{
								name: 'Durée',
								value: convertMinutesToString(duration),
							},
						],
					},
				],
			})
			.catch(error => {
				console.error(error)
			})

		// Vérification si déjà mute en base de données
		let muted = {}
		try {
			const sqlCheck = 'SELECT * FROM mute WHERE discordID = ?'
			const dataCheck = [member.id]
			const [resultCheck] = await bdd.execute(sqlCheck, dataCheck)
			muted = resultCheck[0]
		} catch {
			if (DMMessage) DMMessage.delete()
			return interaction.reply({
				content: 'Une erreur est survenue lors du mute du membre en base de données 😬',
				ephemeral: true,
			})
		}

		// Si oui alors on lève le mute en base de données
		if (muted)
			try {
				const sqlDelete = 'DELETE FROM mute WHERE discordID = ?'
				const dataDelete = [member.id]
				await bdd.execute(sqlDelete, dataDelete)
			} catch {
				if (DMMessage) DMMessage.delete()
				return interaction.reply({
					content: 'Une erreur est survenue lors du mute du membre en base de données 😬',
					ephemeral: true,
				})
			}

		// Insertion du nouveau mute en base de données
		try {
			const sql =
				'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
			const data = [
				member.id,
				Math.round(Date.now() / 1000),
				Math.round(Date.now() / 1000) + duration * 60,
			]

			await bdd.execute(sql, data)
		} catch {
			if (DMMessage) DMMessage.delete()
			return interaction.reply({
				content: 'Une erreur est survenue lors du mute du membre en base de données 😬',
				ephemeral: true,
			})
		}

		// Action de mute du membre
		const muteAction = await member.roles.add(mutedRole).catch(error => {
			if (DMMessage) DMMessage.delete()
			try {
				const sqlDelete = 'DELETE FROM mute WHERE discordID = ?'
				const dataDelete = [member.id]

				bdd.execute(sqlDelete, dataDelete)
			} catch {
				console.error(error)
				return interaction.reply({
					content: 'Une erreur est survenue lors du mute du membre 😬',
					ephemeral: true,
				})
			}

			if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
				return interaction.reply({
					content: "Je n'ai pas les permissions pour mute ce membre 😬",
					ephemeral: true,
				})

			console.error(error)
			return interaction.reply({
				content: 'Une erreur est survenue lors du mute du membre 😬',
				ephemeral: true,
			})
		})

		// Suppression du rôle muted après le temps écoulé
		// et envoi du message privé
		let unmuteDM = ''
		try {
			const sqlSelectUnmute = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectUnmute = ['unmute']
			const [resultSelectUnmute] = await bdd.execute(sqlSelectUnmute, dataSelectUnmute)

			unmuteDM = resultSelectUnmute[0].content
		} catch {
			return interaction.reply({
				content:
					"Une erreur est survenue lors de la récupération du message d'unmute en base de données 😬",
				ephemeral: true,
			})
		}

		const removeRole = async () => {
			if (!member.roles.cache.has(mutedRole)) return
			member.roles.remove(mutedRole).catch(error => {
				if (error.code !== Constants.APIErrors.UNKNOWN_MEMBER) throw error
			})

			// Suppression du mute en base de données
			let deletedMute = {}
			try {
				const sqlDelete = 'DELETE FROM mute WHERE discordID = ?'
				const dataDelete = [member.id]
				const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)
				deletedMute = resultDelete
			} catch (error) {
				console.error(error)
				return interaction.reply({
					content:
						'Une erreur est survenue lors de la levé du mute du membre en base de données 😬',
					ephemeral: true,
				})
			}

			// Si pas d'erreur, envoi du message privé
			if (deletedMute.affectedRows === 1)
				member
					.send({
						embeds: [
							{
								color: '#C27C0E',
								title: 'Mute terminé',
								description: unmuteDM,
								author: {
									name: interaction.guild.name,
									icon_url: interaction.guild.iconURL({
										dynamic: true,
									}),
									url: interaction.guild.vanityURL,
								},
							},
						],
					})
					.catch(error => {
						console.error(error)
					})
		}

		setTimeout(removeRole, duration * 60000)

		// Si pas d'erreur, message de confirmation du mute
		if (muteAction instanceof GuildMember)
			return interaction.reply({
				content: `🔇 \`${member.user.tag}\` est muté pendant \`${convertMinutesToString(
					duration,
				)}\``,
			})

		// Si au moins une erreur, throw
		if (muteAction instanceof Error || DMMessage instanceof Error)
			throw new Error(
				"L'envoi d'un message et / ou le mute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
			)
	},
}
