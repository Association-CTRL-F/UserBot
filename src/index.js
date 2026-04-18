import prepareClient from './util/clientLoader.js'
import eventsLoader from './events/loader.js'
import modalsLoader from './modals/loader.js'
import menusLoader from './select-menus/loader.js'
import buttonsLoader from './buttons/loader.js'
import slashCommandsLoader from './slash-commands/loader.js'
import { closeGracefully } from './util/util.js'

const loadStep = async (label, loader, client) => {
	try {
		await loader(client)
		console.log(`${label} ✅`)
	} catch (error) {
		console.log(`${label} ❌`)
		console.error(error)
		throw error
	}
}

const run = async () => {
	console.log('Starting the app...')

	if (process.env.NODE_ENV !== 'production') {
		const dotenv = await import('dotenv')
		dotenv.config({ path: './config/env/bot.env' })
	}

	const client = await prepareClient()
	console.log('Client ✅')

	process.on('SIGINT', (signal) => closeGracefully(signal, client))
	process.on('SIGTERM', (signal) => closeGracefully(signal, client))

	await loadStep('Events', eventsLoader, client)
	await loadStep('Modals', modalsLoader, client)
	await loadStep('Select Menus', menusLoader, client)
	await loadStep('Buttons', buttonsLoader, client)

	await client.login(client.config.bot.token)

	await slashCommandsLoader(client)

	console.log(
		`Startup finished !\n> Ready :\n  - Version ${client.config.bot.version}\n  - Connected as ${client.user.tag}`,
	)
}

run().catch((error) => {
	console.error('Startup failed ❌')
	console.error(error)
	process.exit(1)
})
