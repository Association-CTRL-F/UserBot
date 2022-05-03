import { Client, Collection, Constants, Intents } from 'discord.js'

// Création du client et de ses propriétés
export default () => {
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
	client.cooldowns = new Collection()
	client.config = {
		prefix: process.env.COMMANDS_PREFIX,
		guildID: process.env.GUILD_ID,
		dbHost: process.env.DB_HOST,
		dbUser: process.env.DB_USER,
		dbPass: process.env.DB_PASS,
		reportChannelID: process.env.REPORT_CHANNEL,
		leaveJoinChannelID: process.env.LEAVE_JOIN_CHANNEL_ID,
		logsMessagesChannelID: process.env.LOGS_MESSAGES_CHANNEL,
		logsBansChannelID: process.env.LOGS_BANS_CHANNEL,
		joinRoleID: process.env.JOIN_ROLE_ID,
		mutedRoleID: process.env.MUTED_ROLE_ID,
		configChannelID: process.env.CONFIG_CHANNEL_ID,
		upgradeChannelID: process.env.UPGRADE_CHANNEL_ID,
		blablaChannelID: process.env.BLABLA_CHANNEL_ID,
		timeoutJoin: process.env.TIMEOUT_JOIN,
		richPresenceText: process.env.RICH_PRESENCE_TEXT,
		voiceManagerChannelsIDs: process.env.VOICE_MANAGER_CHANNELS_IDS
			? process.env.VOICE_MANAGER_CHANNELS_IDS.split(/, */)
			: [],
		noLogsManagerChannelIDs: process.env.NOLOGS_MANAGER_CHANNELS_IDS
			? process.env.NOLOGS_MANAGER_CHANNELS_IDS.split(/, */)
			: [],
		noTextManagerChannelIDs: process.env.NOTEXT_MANAGER_CHANNELS_IDS
			? process.env.NOTEXT_MANAGER_CHANNELS_IDS.split(/, */)
			: [],
		threadsManagerChannelIDs: process.env.THREADS_MANAGER_CHANNELS_IDS
			? process.env.THREADS_MANAGER_CHANNELS_IDS.split(/, */)
			: [],
	}
	client.cache = {
		// Messages supprimés par le bot pour ne pas
		// les log lors de l'event "messageDelete"
		deleteMessagesID: new Set(),
	}
	// Map utilisé pour la commande "rôles"
	client.commandsCategories = new Map()
	// Map utilisé pour la commande "rôles"
	client.modalsCategories = new Map()
	// Map utilisé pour la gestion des salons vocaux
	client.voiceManager = new Map()

	return client
}
