import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js'
import { pool } from './util.js'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'))

export default async () => {
	const client = new Client({
		partials: [Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.Channel],
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildPresences,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildBans,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.MessageContent,
		],
	})

	client.commands = new Collection()
	client.contextmenus = new Collection()
	client.modals = new Collection()
	client.selectmenus = new Collection()
	client.buttons = new Collection()
	client.cooldowns = new Collection()

	let configGuild = null
	try {
		const configRaw = await readFile('./config/env/config.json', 'utf8')
		configGuild = JSON.parse(configRaw)
	} catch (error) {
		console.error('Erreur lors de la lecture de ./config/env/config.json')
		console.error(error)
		throw error
	}

	client.config = {
		timezone: configGuild.timezone,
		db: {
			dbHost: process.env.DB_HOST,
			dbUser: process.env.DB_USER,
			dbPass: process.env.DB_PASS,
		},
		bot: {
			token: process.env.DISCORD_TOKEN,
			richPresenceText: configGuild.richPresenceText,
			version,
		},
		guild: configGuild.guild,
		others: {
			openAiKey: process.env.OPEN_AI_KEY,
		},
	}

	try {
		const [POOL_urlsAPI, POOL_moderation, POOL_userbot] = await Promise.all([
			pool({
				...client.config.db,
				dbName: process.env.DB_NAME_URLS_API,
			}),
			pool({
				...client.config.db,
				dbName: process.env.DB_NAME_MODERATION,
			}),
			pool({
				...client.config.db,
				dbName: process.env.DB_NAME_USERBOT,
			}),
		])

		client.config.db.pools = {
			urlsAPI: POOL_urlsAPI,
			moderation: POOL_moderation,
			userbot: POOL_userbot,
		}
	} catch (error) {
		console.error('Erreur lors de la création des pools de base de données')
		console.error(error)
		throw error
	}

	client.cache = {
		deleteMessagesID: new Set(),
		conseilsUsersID: new Set(),
		blacklistedDomains: new Set(),
		staffRolesReason: new Map(),
	}

	client.commandsCategories = new Map()
	client.modalsCategories = new Map()
	client.selectMenusCategories = new Map()
	client.buttonsCategories = new Map()

	client.voiceManager = new Map()

	return client
}
