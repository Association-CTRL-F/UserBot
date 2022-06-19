import { Client, Collection, Constants, Intents } from 'discord.js'
import { pool } from './util.js'
import { readFileSync } from 'fs'
const { version } = JSON.parse(readFileSync('./package.json'))

// Création du client et de ses propriétés
export default async () => {
	const client = new Client({
		partials: [
			Constants.PartialTypes.GUILD_MEMBER,
			Constants.PartialTypes.MESSAGE,
			Constants.PartialTypes.REACTION,
			Constants.PartialTypes.CHANNEL,
		],
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_PRESENCES,
			Intents.FLAGS.GUILD_MEMBERS,
			Intents.FLAGS.GUILD_BANS,
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.GUILD_VOICE_STATES,
			Intents.FLAGS.DIRECT_MESSAGES,
		],
	})

	client.commands = new Collection()
	client.modals = new Collection()
	client.menus = new Collection()
	client.cooldowns = new Collection()

	client.config = {
		timezone: process.env.TIMEZONE,
		db: {
			dbHost: process.env.DB_HOST,
			dbUser: process.env.DB_USER,
			dbPass: process.env.DB_PASS,
		},
		bot: {
			token: process.env.DISCORD_TOKEN,
			richPresenceText: process.env.RICH_PRESENCE_TEXT,
			version: version,
		},
	}

	// Création des pools
	try {
		const POOL_urlsAPI = await pool({
			...client.config.db,
			dbName: process.env.DN_NAME_URLS_API,
		})
		const POOL_userbot = await pool({
			...client.config.db,
			dbName: process.env.DN_NAME_USERBOT,
		})

		client.config.db.pools = {
			urlsAPI: POOL_urlsAPI,
			userbot: POOL_userbot,
		}
	} catch (error) {
		console.error(error)
	}

	client.cache = {
		// Messages supprimés par le bot pour ne pas
		// les log lors de l'event "messageDelete"
		deleteMessagesID: new Set(),
	}

	// Maps utilisées pour la commande "rôles"
	client.commandsCategories = new Map()
	client.modalsCategories = new Map()
	client.menusCategories = new Map()

	// Map utilisé pour la gestion des salons vocaux
	client.voiceManager = new Map()

	return client
}
