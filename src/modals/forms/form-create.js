import { db } from '../../util/util.js'

export default {
	data: {
		name: 'form-create',
	},
	interaction: async (modal, client) => {
		// Acquisition du nom et du contenu
		const nom = modal.getTextInputValue('name-form').trim().replace(/\s+/g, '-')
		const contenu = modal.getTextInputValue('content-form').trim()

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd) {
			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Vérification si la commande existe
		const sqlCheckName = 'SELECT * FROM forms WHERE name = ?'
		const dataCheckName = [nom]
		const [resultCheckName] = await bdd.execute(sqlCheckName, dataCheckName)

		try {
			// Vérification si le formulaire existe déjà
			if (resultCheckName[0]) {
				await modal.deferReply({ ephemeral: true })
				return modal.followUp({
					content: `Le formulaire **${nom}** existe déjà 😕`,
				})
			}

			// Sinon,insertion du nouveau formulaire en base de données
			const sqlInsert = 'INSERT INTO forms (name, content) VALUES (?, ?)'
			const dataInsert = [nom, contenu]

			const [resultInsert] = await bdd.execute(sqlInsert, dataInsert)

			if (resultInsert.insertId)
				return modal.reply({
					content: `Le formulaire **${nom}** a bien été créé 👌`,
				})

			await modal.deferReply({ ephemeral: true })
			return modal.followUp({
				content: 'Une erreur est survenue lors de la création du formulaire 😬',
			})
		} catch {
			await modal.deferReply({ ephemeral: true })
			return modal.reply({
				content: 'Une erreur est survenue lors de la création du formulaire 😬',
			})
		}
	},
}
