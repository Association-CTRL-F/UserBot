import { Constants } from 'discord.js'
import { readFile } from 'fs/promises'
import { db } from '../../util/util.js'

export default {
	data: {
		name: 'warn-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du membre et de la raison
		const userId = modal.getTextInputValue('warn-member-id')
		const member = modal.guild.members.cache.get(userId)
		if (!member) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})
		}

		const reason = modal.getTextInputValue('warn-reason')

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		try {
			// Acquisition de la raison
			// puis insertion en base de données
			const sqlCreate =
				'INSERT INTO warnings (discordID, warnedBy, warnReason, warnedAt) VALUES (?, ?, ?, ?)'
			const dataCreate = [userId, modal.user.tag, reason, Math.round(Date.now() / 1000)]
			const [resultCreate] = await bdd.execute(sqlCreate, dataCreate)

			// Si erreur
			if (!resultCreate.insertId) {
				await modal.deferReply({ ephemeral: true })
				return modal.followUp({
					content: "Une erreur est survenue lors de la création de l'avertissement 😕",
				})
			}

			// Lecture du message d'avertissement
			const warnDM = await readFile('./forms/warn.md', { encoding: 'utf8' })

			// Envoi du message d'avertissement en message privé
			const DMMessage = await member
				.send({
					embeds: [
						{
							color: '#C27C0E',
							title: 'Avertissement',
							description: warnDM,
							author: {
								name: modal.guild.name,
								icon_url: modal.guild.iconURL({ dynamic: true }),
								url: modal.guild.vanityURL,
							},
							fields: [
								{
									name: "Raison de l'avertissement",
									value: reason,
								},
							],
						},
					],
				})
				.catch(error => {
					if (error.code === Constants.APIErrors.CANNOT_MESSAGE_USER) {
						modal.deferReply({ ephemeral: true })
						return modal.followUp({
							content:
								"Je n'ai pas réussi à envoyer le DM, l'utilisateur mentionné m'a sûrement bloqué / désactivé les messages provenant du serveur 😬",
						})
					}

					console.error(error)

					modal.deferReply({ ephemeral: true })
					return modal.followUp({
						content:
							"Une erreur est survenue lors de la création de l'avertissement 😬",
					})
				})

			// Si au moins une erreur, throw
			if (DMMessage instanceof Error)
				throw new Error(
					"L'envoi d'un message a échoué. Voir les logs précédents pour plus d'informations.",
				)

			// Message de confirmation
			return modal.reply({
				content: `⚠️ \`${member.user.tag}\` a reçu un avertissement`,
			})
		} catch {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la récupération des avertissements 😬',
			})
		}
	},
}
