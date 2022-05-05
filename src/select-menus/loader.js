import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async client => {
	// Dossier des select-menus
	const menusDir = (await readdir('./src/select-menus')).filter(dir => !dir.endsWith('.js'))

	await Promise.all(
		menusDir.map(async menuCategory => {
			const menuFiles = await readdir(`./src/select-menus/${menuCategory}`)

			// Ajout dans la map utilisée pour la commande "rôles"
			client.menusCategories.set(menuCategory, menuFiles.map(removeFileExtension))

			return Promise.all(
				menuFiles.map(async menuFile => {
					const menu = (await import(`../select-menus/${menuCategory}/${menuFile}`))
						.default

					client.menus.set(menu.data.name, menu)
					return menu.data
				}),
			)
		}),
	)
}
