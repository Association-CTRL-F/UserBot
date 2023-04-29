import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js'
import { pool } from './util.js'
import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'

const { version } = JSON.parse(readFileSync('./package.json'))

// Création du client et de ses propriétés
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

	// Lire le fichier config.json
	let configGuild = await readFile('./config/env/config.json', (err, data) => data)
	configGuild = JSON.parse(configGuild)

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
			version: version,
		},
		guild: configGuild.guild,
		others: {
			openAiKey: process.env.OPEN_AI_KEY,
		},
	}

	// Création des pools
	try {
		const POOL_urlsAPI = await pool({
			...client.config.db,
			dbName: process.env.DB_NAME_URLS_API,
		})
		const POOL_userbot = await pool({
			...client.config.db,
			dbName: process.env.DB_NAME_USERBOT,
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
		// Anti-spam commandes /config et /upgrade
		conseilsUsersID: new Set(),
		// Domaines blacklistés
		blacklistedDomains: new Set(),
		// Raison de mddification de rôles staff
		staffRolesReason: new Set(),
	}

	// Maps
	client.commandsCategories = new Map()
	client.modalsCategories = new Map()
	client.selectMenusCategories = new Map()
	client.buttonsCategories = new Map()

	// Map utilisée pour la gestion des salons vocaux
	client.voiceManager = new Map()

	return client
}
