import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async (client) => {
	const modalEntries = await readdir('./src/modals', { withFileTypes: true })

	// On garde uniquement les dossiers de catégories
	const modalCategories = modalEntries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)

	await Promise.all(
		modalCategories.map(async (modalCategory) => {
			const modalFileEntries = await readdir(`./src/modals/${modalCategory}`, {
				withFileTypes: true,
			})

			// On garde uniquement les fichiers JS
			const modalFiles = modalFileEntries
				.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
				.map((entry) => entry.name)

			// Ajout dans la map des catégories
			client.modalsCategories.set(modalCategory, modalFiles.map(removeFileExtension))

			await Promise.all(
				modalFiles.map(async (modalFile) => {
					const modalModule = await import(`../modals/${modalCategory}/${modalFile}`)
					const modal = modalModule.default

					if (!modal?.data?.name || typeof modal.interaction !== 'function') {
						throw new Error(
							`La modal "${modalFile}" dans "${modalCategory}" est invalide.`,
						)
					}

					client.modals.set(modal.data.name, modal)
				}),
			)
		}),
	)
}
