import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async client => {
	// Dossier des modals
	const modalsDir = (await readdir('./src/modals')).filter(dir => !dir.endsWith('.js'))

	await Promise.all(
		modalsDir.map(async modalCategory => {
			const modalFiles = await readdir(`./src/modals/${modalCategory}`)

			// Ajout dans la map utilisée pour la commande "rôles"
			client.modalsCategories.set(modalCategory, modalFiles.map(removeFileExtension))

			return Promise.all(
				modalFiles.map(async modalFile => {
					const modal = (await import(`../modals/${modalCategory}/${modalFile}`)).default

					client.modals.set(modal.data.name, modal)
					return modal.data
				}),
			)
		}),
	)
}
