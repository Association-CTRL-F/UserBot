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
		presence: {
			activities: [
				{
					name: 'Starting...',
					type: 'PLAYING',
				},
			],
			status: 'dnd',
		},
	})

	client.commands = new Collection()
	client.modals = new Collection()
	client.menus = new Collection()
	client.cooldowns = new Collection()

	client.config = {
		db: {
			dbHost: process.env.DB_HOST,
			dbUser: process.env.DB_USER,
			dbPass: process.env.DB_PASS,
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

	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	let config = {}
	try {
		const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
		const dataSelect = [process.env.GUILD_ID]
		const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
		config = resultSelect[0]
	} catch (error) {
		return console.log(error)
	}

	Object.assign(client.config, {
		bot: {
			token: config.DISCORD_TOKEN,
			prefix: config.COMMANDS_PREFIX,
			richPresenceText: config.RICH_PRESENCE_TEXT,
			version: version,
		},
		guild: {
			guildID: config.GUILD_ID,
			timeoutJoin: config.TIMEOUT_JOIN,
			roles: {
				joinRoleID: config.JOIN_ROLE_ID,
				mutedRoleID: config.MUTED_ROLE_ID,
			},
			channels: {
				blablaChannelID: config.BLABLA_CHANNEL_ID,
				configChannelID: config.CONFIG_CHANNEL_ID,
				upgradeChannelID: config.UPGRADE_CHANNEL_ID,
				reportChannelID: config.REPORT_CHANNEL,
				leaveJoinChannelID: config.LEAVE_JOIN_CHANNEL_ID,
				logsMessagesChannelID: config.LOGS_MESSAGES_CHANNEL,
				logsBansChannelID: config.LOGS_BANS_CHANNEL,
				tribunalChannelID: config.TRIBUNAL_CHANNEL_ID,
			},
			managers: {
				voiceManagerChannelsIDs: config.VOICE_MANAGER_CHANNELS_IDS
					? config.VOICE_MANAGER_CHANNELS_IDS.split(/, */)
					: [],
				noLogsManagerChannelIDs: config.NOLOGS_MANAGER_CHANNELS_IDS
					? config.NOLOGS_MANAGER_CHANNELS_IDS.split(/, */)
					: [],
				noTextManagerChannelIDs: config.NOTEXT_MANAGER_CHANNELS_IDS
					? config.NOTEXT_MANAGER_CHANNELS_IDS.split(/, */)
					: [],
				threadsManagerChannelIDs: config.THREADS_MANAGER_CHANNELS_IDS
					? config.THREADS_MANAGER_CHANNELS_IDS.split(/, */)
					: [],
				staffRolesManagerIDs: config.STAFF_ROLES_MANAGER_IDS
					? config.STAFF_ROLES_MANAGER_IDS.split(/, */)
					: [],
			},
		},
	})

	client.cache = {
		// Messages supprimés par le bot pour ne pas
		// les log lors de l'event "messageDelete"
		deleteMessagesID: new Set(),
		// Avertissements pour l'antispam
		warned: [],
	}

	// Maps utilisées pour la commande "rôles"
	client.commandsCategories = new Map()
	client.modalsCategories = new Map()
	client.menusCategories = new Map()

	// Map utilisé pour la gestion des salons vocaux
	client.voiceManager = new Map()

	return client
}
