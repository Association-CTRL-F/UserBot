import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async (client) => {
	const buttonEntries = await readdir('./src/buttons', { withFileTypes: true })

	// On garde uniquement les dossiers de catégories
	const buttonCategories = buttonEntries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)

	await Promise.all(
		buttonCategories.map(async (buttonCategory) => {
			const buttonFileEntries = await readdir(`./src/buttons/${buttonCategory}`, {
				withFileTypes: true,
			})

			// On garde uniquement les fichiers JS
			const buttonFiles = buttonFileEntries
				.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
				.map((entry) => entry.name)

			// Ajout dans la map des catégories
			client.buttonsCategories.set(buttonCategory, buttonFiles.map(removeFileExtension))

			await Promise.all(
				buttonFiles.map(async (buttonFile) => {
					const buttonModule = await import(`../buttons/${buttonCategory}/${buttonFile}`)
					const button = buttonModule.default

					if (!button?.data?.name || typeof button.interaction !== 'function') {
						throw new Error(
							`Le bouton "${buttonFile}" dans "${buttonCategory}" est invalide.`,
						)
					}

					client.buttons.set(button.data.name, button)
				}),
			)
		}),
	)
}
