import { db } from '../../util/util.js'

export default {
	data: {
		name: 'command-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.getTextInputValue('name-command-create')
		const contenu = modal.getTextInputValue('content-command-create')

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si la commande existe
		const sqlCheckName = 'SELECT * FROM commands WHERE name = ?'
		const dataCheckName = [nom]
		const [rowsCheckName] = await bdd.execute(sqlCheckName, dataCheckName)

		try {
			// Vérification si la commande existe déjà
			if (rowsCheckName[0]) {
				await modal.deferReply({ ephemeral: true })
				return modal.followUp({
					content: `La commande **${nom}** existe déjà 😕`,
				})
			}

			// Sinon, insertion de la nouvelle commande
			// en base de données
			const sqlInsert =
				'INSERT INTO commands (name, content, author, createdAt, lastModification, lastModificationBy, numberOfUses) VALUES (?, ?, ?, ?, ?, ?, ?)'

			const dataInsert = [
				nom,
				contenu,
				modal.user.tag,
				Math.round(new Date() / 1000),
				Math.round(new Date() / 1000),
				modal.user.tag,
				0,
			]

			const [rowsInsert] = await bdd.execute(sqlInsert, dataInsert)

			if (rowsInsert.insertId)
				return modal.reply({
					content: `La commande **${nom}** a bien été créée 👌`,
				})

			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la création de la commande 😬',
			})
		} catch {
			await modal.deferReply({ ephemeral: true })
			return modal.reply({
				content: 'Une erreur est survenue lors de la création de la commande 😬',
			})
		}
	},
}
