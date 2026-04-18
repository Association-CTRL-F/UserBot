import { MessageFlags } from 'discord.js'
import { writeFile } from 'node:fs/promises'

const regexId = /^\d{17,19}$/
const regexIds = /^\d{17,19}(?:\s*,\s*\d{17,19})*$/

const validateSingleId = (value) => regexId.test(value)
const validateMultipleIds = (value) => regexIds.test(value)

export default {
	data: {
		name: 'setup',
	},
	interaction: async (modal, client) => {
		const fieldId = modal.components[0].components[0].customId
		let value = modal.fields.getTextInputValue(fieldId).trim()

		const singleIdFields = new Set([
			'LEAVE_JOIN_CHANNEL_ID',
			'REPORT_CHANNEL_ID',
			'LOGS_MESSAGES_CHANNEL_ID',
			'LOGS_BANS_CHANNEL_ID',
			'LOGS_ROLES_CHANNEL_ID',
			'MEDIATION_CHANNEL_ID',
			'CONFIG_CHANNEL_ID',
			'UPGRADE_CHANNEL_ID',
			'BLABLA_CHANNEL_ID',
			'FREE_GAMES_CHANNEL_ID',
			'MEMBER_ROLE_ID',
			'JOIN_ROLE_ID',
			'MUTED_ROLE_ID',
			'STAFF_EDITEURS_ROLE_ID',
			'MODO_ROLE_ID',
			'CERTIF_ROLE_ID',
			'NOTIF_GAMES_ROLE_ID',
		])

		const multiIdFields = new Set([
			'VOICE_MANAGER_CHANNELS_IDS',
			'NOLOGS_MANAGER_CHANNELS_IDS',
			'NOTEXT_MANAGER_CHANNELS_IDS',
			'THREADS_MANAGER_CHANNELS_IDS',
		])

		if (singleIdFields.has(fieldId) && !validateSingleId(value)) {
			return modal.reply({
				content: "Tu n'as pas donné un ID valide 😕",
				flags: MessageFlags.Ephemeral,
			})
		}

		if (multiIdFields.has(fieldId) && value !== '' && !validateMultipleIds(value)) {
			return modal.reply({
				content: "Tu n'as pas donné un / des ID(s) valide(s) 😕",
				flags: MessageFlags.Ephemeral,
			})
		}

		if (value === '') value = null

		switch (fieldId) {
			// Bot
			case 'RICH_PRESENCE_TEXT':
				client.config.bot.richPresenceText = value

				if (value) {
					await client.user.setPresence({
						activities: [
							{
								name: value,
								type: 0,
							},
						],
						status: 'online',
					})
				} else {
					await client.user.setPresence({
						activities: [],
						status: 'online',
					})
				}
				break

			// Guild
			case 'TIMEOUT_JOIN':
				client.config.guild.TIMEOUT_JOIN = value
				break

			case 'COMMANDS_PREFIX':
				client.config.guild.COMMANDS_PREFIX = value
				break

			// Salons
			case 'LEAVE_JOIN_CHANNEL_ID':
				client.config.guild.channels.LEAVE_JOIN_CHANNEL_ID = value
				break

			case 'REPORT_CHANNEL_ID':
				client.config.guild.channels.REPORT_CHANNEL_ID = value
				break

			case 'LOGS_MESSAGES_CHANNEL_ID':
				client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID = value
				break

			case 'LOGS_BANS_CHANNEL_ID':
				client.config.guild.channels.LOGS_BANS_CHANNEL_ID = value
				break

			case 'LOGS_ROLES_CHANNEL_ID':
				client.config.guild.channels.LOGS_ROLES_CHANNEL_ID = value
				break

			case 'MEDIATION_CHANNEL_ID':
				client.config.guild.channels.MEDIATION_CHANNEL_ID = value
				break

			case 'CONFIG_CHANNEL_ID':
				client.config.guild.channels.CONFIG_CHANNEL_ID = value
				break

			case 'UPGRADE_CHANNEL_ID':
				client.config.guild.channels.UPGRADE_CHANNEL_ID = value
				break

			case 'BLABLA_CHANNEL_ID':
				client.config.guild.channels.BLABLA_CHANNEL_ID = value
				break

			case 'FREE_GAMES_CHANNEL_ID':
				client.config.guild.channels.FREE_GAMES_CHANNEL_ID = value
				break

			// Rôles
			case 'MEMBER_ROLE_ID':
				client.config.guild.roles.MEMBER_ROLE_ID = value
				break

			case 'JOIN_ROLE_ID':
				client.config.guild.roles.JOIN_ROLE_ID = value
				break

			case 'MUTED_ROLE_ID':
				client.config.guild.roles.MUTED_ROLE_ID = value
				break

			case 'STAFF_EDITEURS_ROLE_ID':
				client.config.guild.roles.STAFF_EDITEURS_ROLE_ID = value
				break

			case 'MODO_ROLE_ID':
				client.config.guild.roles.MODO_ROLE_ID = value
				break

			case 'CERTIF_ROLE_ID':
				client.config.guild.roles.CERTIF_ROLE_ID = value
				break

			case 'NOTIF_GAMES_ROLE_ID':
				client.config.guild.roles.NOTIF_GAMES_ROLE_ID = value
				break

			// Managers
			case 'VOICE_MANAGER_CHANNELS_IDS':
				client.config.guild.managers.VOICE_MANAGER_CHANNELS_IDS = value
				break

			case 'NOLOGS_MANAGER_CHANNELS_IDS':
				client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS = value
				break

			case 'NOTEXT_MANAGER_CHANNELS_IDS':
				client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS = value
				break

			case 'THREADS_MANAGER_CHANNELS_IDS':
				client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS = value
				break
		}

		const config = {
			timezone: client.config.timezone,
			richPresenceText: client.config.bot.richPresenceText,
			guild: {
				GUILD_ID: client.config.guild.GUILD_ID,
				TIMEOUT_JOIN: client.config.guild.TIMEOUT_JOIN,
				COMMANDS_PREFIX: client.config.guild.COMMANDS_PREFIX,
				channels: {
					LEAVE_JOIN_CHANNEL_ID: client.config.guild.channels.LEAVE_JOIN_CHANNEL_ID,
					REPORT_CHANNEL_ID: client.config.guild.channels.REPORT_CHANNEL_ID,
					LOGS_MESSAGES_CHANNEL_ID: client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
					LOGS_BANS_CHANNEL_ID: client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
					LOGS_ROLES_CHANNEL_ID: client.config.guild.channels.LOGS_ROLES_CHANNEL_ID,
					MEDIATION_CHANNEL_ID: client.config.guild.channels.MEDIATION_CHANNEL_ID,
					CONFIG_CHANNEL_ID: client.config.guild.channels.CONFIG_CHANNEL_ID,
					UPGRADE_CHANNEL_ID: client.config.guild.channels.UPGRADE_CHANNEL_ID,
					BLABLA_CHANNEL_ID: client.config.guild.channels.BLABLA_CHANNEL_ID,
					FREE_GAMES_CHANNEL_ID: client.config.guild.channels.FREE_GAMES_CHANNEL_ID,
				},
				roles: {
					MEMBER_ROLE_ID: client.config.guild.roles.MEMBER_ROLE_ID,
					JOIN_ROLE_ID: client.config.guild.roles.JOIN_ROLE_ID,
					MUTED_ROLE_ID: client.config.guild.roles.MUTED_ROLE_ID,
					STAFF_EDITEURS_ROLE_ID: client.config.guild.roles.STAFF_EDITEURS_ROLE_ID,
					MODO_ROLE_ID: client.config.guild.roles.MODO_ROLE_ID,
					CERTIF_ROLE_ID: client.config.guild.roles.CERTIF_ROLE_ID,
					NOTIF_GAMES_ROLE_ID: client.config.guild.roles.NOTIF_GAMES_ROLE_ID,
				},
				managers: {
					VOICE_MANAGER_CHANNELS_IDS:
						client.config.guild.managers.VOICE_MANAGER_CHANNELS_IDS,
					NOLOGS_MANAGER_CHANNELS_IDS:
						client.config.guild.managers.NOLOGS_MANAGER_CHANNELS_IDS,
					NOTEXT_MANAGER_CHANNELS_IDS:
						client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS,
					THREADS_MANAGER_CHANNELS_IDS:
						client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS,
				},
			},
		}

		await writeFile('./config/env/config.json', JSON.stringify(config, null, 2), 'utf8')

		return modal.reply({
			content: `La configuration de **${fieldId}** a bien été modifiée 👌`,
			flags: MessageFlags.Ephemeral,
		})
	},
}
