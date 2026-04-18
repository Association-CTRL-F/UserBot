import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async (client) => {
	const menuEntries = await readdir('./src/select-menus', { withFileTypes: true })

	// On garde uniquement les dossiers de catégories
	const menuCategories = menuEntries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)

	await Promise.all(
		menuCategories.map(async (menuCategory) => {
			const menuFileEntries = await readdir(`./src/select-menus/${menuCategory}`, {
				withFileTypes: true,
			})

			// On garde uniquement les fichiers JS
			const menuFiles = menuFileEntries
				.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
				.map((entry) => entry.name)

			// Ajout dans la map des catégories
			client.selectMenusCategories.set(menuCategory, menuFiles.map(removeFileExtension))

			await Promise.all(
				menuFiles.map(async (menuFile) => {
					const menuModule = await import(`../select-menus/${menuCategory}/${menuFile}`)
					const menu = menuModule.default

					if (!menu?.data?.name || typeof menu.interaction !== 'function') {
						throw new Error(
							`Le select-menu "${menuFile}" dans "${menuCategory}" est invalide.`,
						)
					}

					client.selectmenus.set(menu.data.name, menu)
				}),
			)
		}),
	)
}
