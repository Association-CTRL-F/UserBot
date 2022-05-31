import prepareClient from './util/clientLoader.js'
import eventsLoader from './events/loader.js'
import modalsLoader from './modals/loader.js'
import menusLoader from './select-menus/loader.js'
import slashCommandsLoader from './slash-commands/loader.js'
import { closeGracefully } from './util/util.js'

const run = async () => {
	console.log(`Starting the app...\n`)

	// Chargement des variables d'environnement si l'environnement
	// n'est pas "production"
	if (process.env.NODE_ENV !== 'production') {
		const dotenv = await import('dotenv')
		dotenv.config({ path: './config/env/bot.env' })
	}

	const client = await prepareClient()
	console.log('Client ✅')

	await eventsLoader(client)
	console.log('Events ✅')

	await modalsLoader(client)
	console.log('Modals ✅')

	await menusLoader(client)
	console.log('Menus ✅')

	await client.login(client.config.bot.token)

	await slashCommandsLoader(client)
	console.log('Slash commands ✅\n')

	process.on('SIGINT', signal => closeGracefully(signal, client))
	process.on('SIGTERM', signal => closeGracefully(signal, client))
}

run().catch(error => console.error(error))
