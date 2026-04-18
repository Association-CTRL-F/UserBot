import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	ActionRowBuilder,
	TextInputStyle,
	MessageFlags,
} from 'discord.js'

const subCommands = {
	'rich-presence-text': {
		key: 'RICH_PRESENCE_TEXT',
		description: 'Texte de présence du bot',
		required: false,
		getValue: (client) => client.config.bot.richPresenceText,
	},
	'timeout-join': {
		key: 'TIMEOUT_JOIN',
		description: 'Temps du @Pas de blabla',
		required: true,
		getValue: (client) => client.config.guild.TIMEOUT_JOIN,
	},
	'commands-prefix': {
		key: 'COMMANDS_PREFIX',
		description: 'Préfixe des commandes personnalisées',
		required: true,
		getValue: (client) => client.config.guild.COMMANDS_PREFIX,
	},

	// Salons
	'leave-join-channel': {
		key: 'LEAVE_JOIN_CHANNEL_ID',
		description: 'Salon départs-arrivées',
		required: true,
		getValue: (client) => client.config.guild.channels.LEAVE_JOIN_CHANNEL_ID,
	},
	'report-channel': {
		key: 'REPORT_CHANNEL_ID',
		description: 'Salon signalements',
		required: true,
		getValue: (client) => client.config.guild.channels.REPORT_CHANNEL_ID,
	},
	'logs-messages-channel': {
		key: 'LOGS_MESSAGES_CHANNEL_ID',
		description: 'Salon logs messages',
		required: true,
		getValue: (client) => client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
	},
	'logs-bans-channel': {
		key: 'LOGS_BANS_CHANNEL_ID',
		description: 'Salon logs bans',
		required: true,
		getValue: (client) => client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
	},
	'logs-roles-channel': {
		key: 'LOGS_ROLES_CHANNEL_ID',
		description: 'Salon logs rôles',
		required: true,
		getValue: (client) => client.config.guild.channels.LOGS_ROLES_CHANNEL_ID,
	},
	'mediation-channel': {
		key: 'MEDIATION_CHANNEL_ID',
		description: 'Salon médiation',
		required: true,
		getValue: (client) => client.config.guild.channels.MEDIATION_CHANNEL_ID,
	},
	'config-channel': {
		key: 'CONFIG_CHANNEL_ID',
		description: 'Salon config',
		required: true,
		getValue: (client) => client.config.guild.channels.CONFIG_CHANNEL_ID,
	},
	'upgrade-channel': {
		key: 'UPGRADE_CHANNEL_ID',
		description: 'Salon upgrade',
		required: true,
		getValue: (client) => client.config.guild.channels.UPGRADE_CHANNEL_ID,
	},
	'blabla-channel': {
		key: 'BLABLA_CHANNEL_ID',
		description: 'Salon blabla-hs',
		required: true,
		getValue: (client) => client.config.guild.channels.BLABLA_CHANNEL_ID,
	},

	// Rôles
	'member-role': {
		key: 'MEMBER_ROLE_ID',
		description: 'Rôle @Membres',
		required: true,
		getValue: (client) => client.config.guild.roles.MEMBER_ROLE_ID,
	},
	'join-role': {
		key: 'JOIN_ROLE_ID',
		description: 'Rôle @Pas de blabla',
		required: true,
		getValue: (client) => client.config.guild.roles.JOIN_ROLE_ID,
	},
	'muted-role': {
		key: 'MUTED_ROLE_ID',
		description: 'Rôle @Muted',
		required: true,
		getValue: (client) => client.config.guild.roles.MUTED_ROLE_ID,
	},
	'staff-editeurs-role': {
		key: 'STAFF_EDITEURS_ROLE_ID',
		description: 'Rôle @STAFF éditeurs',
		required: true,
		getValue: (client) => client.config.guild.roles.STAFF_EDITEURS_ROLE_ID,
	},
	'modo-role': {
		key: 'MODO_ROLE_ID',
		description: 'Rôle @Modos',
		required: true,
		getValue: (client) => client.config.guild.roles.MODO_ROLE_ID,
	},
	'certif-role': {
		key: 'CERTIF_ROLE_ID',
		description: 'Rôle @Certifiés',
		required: true,
		getValue: (client) => client.config.guild.roles.CERTIF_ROLE_ID,
	},

	// Managers
	'voice-channels': {
		key: 'VOICE_MANAGER_CHANNELS_IDS',
		description: 'Salons vocaux',
		required: true,
		getValue: (client) => client.config.guild.managers.VOICE_MANAGER_CHANNELS_IDS,
	},
	'no-logs-channels': {
		key: 'NOLOGS_MANAGER_CHANNELS_IDS',
		description: 'Salons no-logs messages',
		required: false,
		getValue: (client) => client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS,
	},
	'no-text-channels': {
		key: 'NOTEXT_MANAGER_CHANNELS_IDS',
		description: 'Salons no-text messages',
		required: false,
		getValue: (client) => client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS,
	},
	'threads-channels': {
		key: 'THREADS_MANAGER_CHANNELS_IDS',
		description: 'Salons threads auto',
		required: false,
		getValue: (client) => client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS,
	},
}

const command = new SlashCommandBuilder()
	.setName('setup')
	.setDescription('Configuration du serveur')

for (const [subCommandName, config] of Object.entries(subCommands)) {
	command.addSubcommand((subcommand) =>
		subcommand.setName(subCommandName).setDescription(config.description),
	)
}

export default {
	data: command,
	interaction: (interaction) => {
		const selectedSubcommand = interaction.options.getSubcommand()
		const config = subCommands[selectedSubcommand]

		if (!config) {
			return interaction.reply({
				content: 'Sous-commande inconnue 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		const value = config.getValue(interaction.client) ?? ''

		const input = new TextInputBuilder()
			.setCustomId(config.key)
			.setLabel(config.key)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(String(value))
			.setRequired(config.required)

		const modal = new ModalBuilder()
			.setCustomId('setup')
			.setTitle('Configuration du serveur')
			.addComponents(new ActionRowBuilder().addComponents(input))

		return interaction.showModal(modal)
	},
}
