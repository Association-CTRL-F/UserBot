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

	const client = await prepareClient().catch(() => console.log('Client ❌'))
	if (client) console.log('Client ✅')

	try {
		await eventsLoader(client)
		console.log('Events ✅')
	} catch {
		console.log('Events ❌')
	}

	try {
		await modalsLoader(client)
		console.log('Modals ✅')
	} catch {
		console.log('Modals ❌')
	}

	try {
		await menusLoader(client)
		console.log('Menus ✅')
	} catch {
		console.log('Menus ❌')
	}

	await client.login(client.config.bot.token)

	await slashCommandsLoader(client)

	const richPresenceText = client.config.bot.richPresenceText
	if (richPresenceText && richPresenceText !== '')
		await client.user.setPresence({
			activities: [
				{
					name: richPresenceText,
					type: 'PLAYING',
				},
			],
			status: 'online',
		})
	else await client.user.setPresence({ activities: [], status: 'online' })

	console.log(
		`Startup finished !\n\n> Ready :\n  - Version ${client.config.bot.version}\n  - Connected as ${client.user.username}`,
	)

	process.on('unhandledRejection', error => {
		console.error('Unhandled promise rejection : ', error)
	})

	process.on('SIGINT', signal => closeGracefully(signal, client))
	process.on('SIGTERM', signal => closeGracefully(signal, client))
}

run().catch(error => console.error(error))
