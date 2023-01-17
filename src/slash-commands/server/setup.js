/* eslint-disable default-case */
/* eslint-disable no-unused-vars */
import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	ActionRowBuilder,
	ButtonStyle,
	TextInputStyle,
} from 'discord.js'
import { readFile } from 'fs/promises'
import { Pagination } from 'pagination.djs'

const subCommands = {
	timezone: {
		timezone: 'Timezone du serveur',
	},
	'rich-presence-text': {
		richPresenceText: 'Texte de présence du bot',
	},
	'timeout-join': {
		TIMEOUT_JOIN: 'Temps du @Pas de blabla',
	},
	'commands-prefix': {
		COMMANDS_PREFIX: 'Préfixe des commandes personnalisées',
	},
	'leave-join-channel': {
		LEAVE_JOIN_CHANNEL_ID: 'Salon départs-arrivées',
	},
	'report-channel': {
		REPORT_CHANNEL_ID: 'Salon signalements',
	},
	'logs-messages-channel': {
		LOGS_MESSAGES_CHANNEL_ID: 'Salon logs messages',
	},
	'logs-bans-channel': {
		LOGS_BANS_CHANNEL_ID: 'Salon logs bans',
	},
	'tribunal-channel': {
		TRIBUNAL_CHANNEL_ID: 'Salon tribunal',
	},
	'config-channel': {
		CONFIG_CHANNEL_ID: 'Salon config',
	},
	'upgrade-channel': {
		UPGRADE_CHANNEL_ID: 'Salon upgrade',
	},
	'blabla-channel': {
		BLABLA_CHANNEL_ID: 'Salon blabla-hs',
	},
	'access-channel': {
		ACCESS_CHANNEL_ID: 'Salon acces-aux-canaux',
	},
	'join-role': {
		JOIN_ROLE_ID: 'Rôle @Pas de blabla',
	},
	'no-entraide-role': {
		NO_ENTRAIDE_ROLE_ID: "Rôle @Pas d'entraide",
	},
	'muted-role': {
		MUTED_ROLE_ID: 'Rôle @Muted',
	},
	'voice-channels': {
		VOICE_MANAGER_CHANNELS_IDS: 'Salons vocaux',
	},
	'no-logs-channels': {
		NOLOGS_MANAGER_CHANNELS_IDS: 'Salons no-logs messages',
	},
	'no-text-channels': {
		NOTEXT_MANAGER_CHANNELS_IDS: 'Salons no-text messages',
	},
	'threads-channels': {
		THREADS_MANAGER_CHANNELS_IDS: 'Salons threads',
	},
	'staff-roles': {
		STAFF_ROLES_MANAGER_IDS: 'Rôles staff',
	},
}

const command = new SlashCommandBuilder()
	.setName('setup')
	.setDescription('Configuration du serveur')
	.addSubcommand(subCommand =>
		subCommand.setName('view').setDescription('Voir la configuration du serveur'),
	)

for (const [subCommandName, subCommandContent] of Object.entries(subCommands))
	for (const [subCommandCode, subCommandDesc] of Object.entries(subCommandContent))
		command.addSubcommand(subCommand =>
			subCommand.setName(subCommandName).setDescription(subCommandDesc),
		)

export default {
	data: command,
	interaction: (interaction, client) => {
		if (interaction.options.getSubcommand() === 'view') {
			// Récupération des valeurs actuelles
			const fieldsEmbedView = []

			fieldsEmbedView.push({
				name: 'TIMEZONE',
				value: client.config.timezone ? client.config.timezone : 'Aucune valeur définie',
			})

			fieldsEmbedView.push({
				name: 'RICH_PRESENCE_TEXT',
				value: client.config.bot.richPresenceText
					? client.config.bot.richPresenceText
					: 'Aucune valeur définie',
			})

			// Guild
			for (const [varCode, varContent] of Object.entries(client.config.guild)) {
				// eslint-disable-next-line no-continue
				if (typeof varContent === 'object' || varCode === 'GUILD_ID') continue
				fieldsEmbedView.push({
					name: varCode,
					value: `${varContent ? varContent : 'Aucune valeur définie'}`,
				})
			}

			// Salons
			for (const [varCode, varContent] of Object.entries(client.config.guild.channels))
				fieldsEmbedView.push({
					name: varCode,
					value: `${varContent ? varContent : 'Aucune valeur définie'}`,
				})

			// Rôles
			for (const [varCode, varContent] of Object.entries(client.config.guild.roles))
				fieldsEmbedView.push({
					name: varCode,
					value: `${varContent ? varContent : 'Aucune valeur définie'}`,
				})

			// Managers
			for (const [varCode, varContent] of Object.entries(client.config.guild.managers))
				fieldsEmbedView.push({
					name: varCode,
					value: `${varContent ? varContent : 'Aucune valeur définie'}`,
				})

			// Configuration de l'embed
			const paginationView = new Pagination(interaction, {
				firstEmoji: '⏮',
				prevEmoji: '◀️',
				nextEmoji: '▶️',
				lastEmoji: '⏭',
				limit: 5,
				idle: 120000,
				ephemeral: false,
				prevDescription: '',
				postDescription: '',
				buttonStyle: ButtonStyle.Secondary,
				loop: false,
			})

			paginationView.setTitle('Configuration du serveur')
			paginationView.setColor('#C27C0E')
			paginationView.setAuthor({
				name: `${interaction.guild.name} (ID : ${interaction.guild.id})`,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
			})
			paginationView.setFields(fieldsEmbedView)
			paginationView.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
			paginationView.paginateFields(true)

			// Envoi de l'embed
			return paginationView.render()
		}

		let customId = ''
		let value = ''

		switch (interaction.options.getSubcommand()) {
			case 'timezone':
				customId = 'TIMEZONE'
				value = client.config.timezone
				break

			case 'rich-presence-text':
				customId = 'RICH_PRESENCE_TEXT'
				value = client.config.bot.richPresenceText
				break

			case 'timeout-join':
				customId = 'TIMEOUT_JOIN'
				value = client.config.guild.TIMEOUT_JOIN
				break

			case 'commands-prefix':
				customId = 'COMMANDS_PREFIX'
				value = client.config.guild.COMMANDS_PREFIX
				break

			// Salons
			case 'leave-join-channel':
				customId = 'LEAVE_JOIN_CHANNEL_ID'
				value = client.config.guild.channels.LEAVE_JOIN_CHANNEL_ID
				break

			case 'report-channel':
				customId = 'REPORT_CHANNEL_ID'
				value = client.config.guild.channels.REPORT_CHANNEL_ID
				break

			case 'logs-messages-channel':
				customId = 'LOGS_MESSAGES_CHANNEL_ID'
				value = client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID
				break

			case 'logs-bans-channel':
				customId = 'LOGS_BANS_CHANNEL_ID'
				value = client.config.guild.channels.LOGS_BANS_CHANNEL_ID
				break

			case 'tribunal-channel':
				customId = 'TRIBUNAL_CHANNEL_ID'
				value = client.config.guild.channels.TRIBUNAL_CHANNEL_ID
				break

			case 'config-channel':
				customId = 'CONFIG_CHANNEL_ID'
				value = client.config.guild.channels.CONFIG_CHANNEL_ID
				break

			case 'upgrade-channel':
				customId = 'UPGRADE_CHANNEL_ID'
				value = client.config.guild.channels.UPGRADE_CHANNEL_ID
				break

			case 'blabla-channel':
				customId = 'BLABLA_CHANNEL_ID'
				value = client.config.guild.channels.BLABLA_CHANNEL_ID
				break

			case 'access-channel':
				customId = 'ACCESS_CHANNEL_ID'
				value = client.config.guild.channels.ACCESS_CHANNEL_ID
				break

			// Rôles
			case 'join-role':
				customId = 'JOIN_ROLE_ID'
				value = client.config.guild.roles.JOIN_ROLE_ID
				break

			case 'no-entraide-role':
				customId = 'NO_ENTRAIDE_ROLE_ID'
				value = client.config.guild.roles.NO_ENTRAIDE_ROLE_ID
				break

			case 'muted-role':
				customId = 'MUTED_ROLE_ID'
				value = client.config.guild.roles.MUTED_ROLE_ID
				break

			// Managers
			case 'voice-channels':
				customId = 'VOICE_MANAGER_CHANNELS_IDS'
				value = client.config.guild.managers.VOICE_MANAGER_CHANNELS_IDS
				break

			case 'no-logs-channels':
				customId = 'NOLOGS_MANAGER_CHANNELS_IDS'
				value = client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS
				break

			case 'no-text-channels':
				customId = 'NOTEXT_MANAGER_CHANNELS_IDS'
				value = client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS
				break

			case 'threads-channels':
				customId = 'THREADS_MANAGER_CHANNELS_IDS'
				value = client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS
				break

			case 'staff-roles':
				customId = 'STAFF_ROLES_MANAGER_IDS'
				value = client.config.guild.managers.STAFF_ROLES_MANAGER_IDS
				break
		}

		const modal = new ModalBuilder()
			.setCustomId('setup')
			.setTitle('Configuration du serveur')
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId(customId)
						.setLabel(customId)
						.setStyle(TextInputStyle.Paragraph)
						.setValue(value ? value : '')
						.setRequired(true),
				),
			)

		if (customId === 'RICH_PRESENCE_TEXT')
			modal.components[0].components[0].data.required = false

		return interaction.showModal(modal)
	},
}
