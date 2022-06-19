import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async client => {
	// Dossier des select-menus
	const menusDir = (await readdir('./src/select-menus')).filter(dir => !dir.endsWith('.js'))

	await Promise.all(
		menusDir.map(async menuCategory => {
			const menuFiles = await readdir(`./src/select-menus/${menuCategory}`)

			// Ajout dans la map
			client.selectMenusCategories.set(menuCategory, menuFiles.map(removeFileExtension))

			return Promise.all(
				menuFiles.map(async menuFile => {
					const menu = (await import(`../select-menus/${menuCategory}/${menuFile}`))
						.default

					client.selectmenus.set(menu.data.name, menu)
					return menu.data
				}),
			)
		}),
	)
}
