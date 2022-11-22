import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async client => {
	// Dossier des buttons
	const buttonsDir = (await readdir('./src/buttons')).filter(dir => !dir.endsWith('.js'))

	await Promise.all(
		buttonsDir.map(async buttonCategory => {
			const buttonFiles = await readdir(`./src/buttons/${buttonCategory}`)

			// Ajout dans la map
			client.buttonsCategories.set(buttonCategory, buttonFiles.map(removeFileExtension))

			return Promise.all(
				buttonFiles.map(async buttonFile => {
					const button = (await import(`../buttons/${buttonCategory}/${buttonFile}`))
						.default

					client.buttons.set(button.data.name, button)
					return button.data
				}),
			)
		}),
	)
}
