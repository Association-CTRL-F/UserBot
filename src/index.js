import prepareClient from './util/clientLoader.js'
import eventsLoader from './events/loader.js'
import modalsLoader from './modals/loader.js'
import menusLoader from './select-menus/loader.js'
import slashCommandsLoader from './slash-commands/loader.js'
import { closeGracefully } from './util/util.js'

const run = async () => {
	console.log('Starting the app...')

	// Chargement des variables d'environnement si l'environnement
	// n'est pas "production"
	if (process.env.NODE_ENV !== 'production') {
		const dotenv = await import('dotenv')
		dotenv.config({ path: './config/env/bot.env' })
	}

	const client = await prepareClient()

	await eventsLoader(client)

	await modalsLoader(client)

	await menusLoader(client)

	await client.login(process.env.DISCORD_TOKEN)

	await slashCommandsLoader(client)

	console.log('Setup finished')

	process.on('SIGINT', signal => closeGracefully(signal, client))
	process.on('SIGTERM', signal => closeGracefully(signal, client))
}

run().catch(error => console.error(error))
