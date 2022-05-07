import { db } from '../../util/util.js'

export default {
	data: {
		name: 'warn-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du membre et de la raison
		const userId = modal.getTextInputValue('warn-member-id').trim().replace(/\s+/g, '')
		const member = modal.guild.members.cache.get(userId)
		if (!member) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})
		}

		const reason = modal.getTextInputValue('warn-reason').trim()

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Création de l'avertissement en base de données
		try {
			const sqlCreate =
				'INSERT INTO warnings (discordID, warnedBy, warnReason, warnedAt) VALUES (?, ?, ?, ?)'
			const dataCreate = [userId, modal.user.id, reason, Math.round(Date.now() / 1000)]
			await bdd.execute(sqlCreate, dataCreate)
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					"Une erreur est survenue lors de la création de l'avertissement en base de données 😕",
			})
		}

		// Lecture du message d'avertissement
		let warnDM = ''
		try {
			const sqlSelectUnmute = 'SELECT * FROM forms WHERE name = ?'
			const dataSelectUnmute = ['warn']
			const [resultSelectWarn] = await bdd.execute(sqlSelectUnmute, dataSelectUnmute)
			warnDM = resultSelectWarn[0].content
		} catch (error) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content:
					"Une erreur est survenue lors de la récupération du message d'avertissement en base de données 😕",
			})
		}

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
				console.error(error)
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
	},
}
