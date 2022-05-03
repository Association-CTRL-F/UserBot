import prepareClient from './util/clientLoader.js'
import slashCommandsLoader from './slash-commands/loader.js'
import modalsLoader from './modals/loader.js'
import eventsLoader from './events/loader.js'
import { closeGracefully } from './util/util.js'
import discordModals from 'discord-modals'

const run = async () => {
	console.log('Starting the app...')

	// Chargement des variables d'environnement si l'environnement
	// n'est pas "production"
	if (process.env.NODE_ENV !== 'production') {
		const dotenv = await import('dotenv')
		dotenv.config({ path: './config/bot.env' })
	}

	const client = prepareClient()

	await eventsLoader(client)

	discordModals(client)
	await modalsLoader(client)

	await client.login(process.env.DISCORD_TOKEN)

	await slashCommandsLoader(client)

	console.log('Setup finished')

	process.on('SIGINT', signal => closeGracefully(signal, client))
	process.on('SIGTERM', signal => closeGracefully(signal, client))
}

run().catch(error => console.error(error))
