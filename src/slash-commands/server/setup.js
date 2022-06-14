/* eslint-disable no-unused-vars */
import { SlashCommandBuilder } from '@discordjs/builders'
import { Modal, TextInputComponent, MessageActionRow } from 'discord.js'

const subCommands = {
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
	'join-role': {
		JOIN_ROLE_ID: 'Rôle @Pas de blabla',
	},
	'timeout-join': {
		TIMEOUT_JOIN: 'Timeout rôle @Pas de blabla',
	},
	'muted-role': {
		MUTED_ROLE_ID: 'Rôle @Muted',
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

for (const [subCommandName, subCommandContent] of Object.entries(subCommands))
	for (const [subCommandCode, subCommandDesc] of Object.entries(subCommandContent))
		command.addSubcommand(subCommand =>
			subCommand.setName(subCommandName).setDescription(subCommandDesc),
		)

export default {
	data: command,
	interaction: async (interaction, client) => {
		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Récupération de la valeur actuelle
		let config = {}
		try {
			const sql = `SELECT ${
				Object.keys(subCommands[interaction.options.getSubcommand()])[0]
			} FROM config WHERE GUILD_ID = ?`
			const data = [interaction.guild.id]
			const [result] = await bdd.execute(sql, data)
			config = result[0]
		} catch (error) {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la récupération de la configuration en base de données 😕',
				ephemeral: true,
			})
		}

		const modalEdit = new Modal()
			.setCustomId('setup')
			.setTitle('Configuration du serveur')
			.addComponents(
				new MessageActionRow().addComponents(
					new TextInputComponent()
						.setCustomId(Object.keys(config)[0])
						.setLabel(Object.keys(config)[0])
						.setStyle('PARAGRAPH')
						.setValue(Object.values(config)[0] ? Object.values(config)[0] : '')
						.setRequired(true),
				),
			)

		return interaction.showModal(modalEdit)
	},
}
