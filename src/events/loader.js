import { readdir } from 'fs/promises'
import { removeFileExtension } from '../util/util.js'

export default async (client) => {
	// Dossier des catégories d'events
	const eventEntries = await readdir('./src/events', { withFileTypes: true })

	const eventCategories = eventEntries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)

	await Promise.all(
		eventCategories.map(async (eventCategory) => {
			// Acquisition des fichiers d'events de la catégorie
			const eventFileEntries = await readdir(`./src/events/${eventCategory}`, {
				withFileTypes: true,
			})

			const eventFiles = eventFileEntries
				.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
				.map((entry) => entry.name)

			await Promise.all(
				eventFiles.map(async (eventFile) => {
					const eventModule = await import(`../events/${eventCategory}/${eventFile}`)
					const execute = eventModule.default
					const once = eventModule.once
					const eventName = removeFileExtension(eventFile)

					if (typeof execute !== 'function') {
						throw new Error(
							`L'event "${eventFile}" dans "${eventCategory}" n'exporte pas de fonction par défaut.`,
						)
					}

					if (once) {
						client.once(eventName, (...args) => execute(...args, client))
					} else {
						client.on(eventName, (...args) => execute(...args, client))
					}
				}),
			)
		}),
	)
}
