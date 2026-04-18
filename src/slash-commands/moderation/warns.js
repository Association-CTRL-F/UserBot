import { SlashCommandBuilder, EmbedBuilder, ButtonStyle, MessageFlags } from 'discord.js'
import { convertDateForDiscord, displayNameAndID } from '../../util/util.js'
import { Pagination } from 'pagination.djs'

const isValidDiscordId = (value) => /^\d{17,19}$/.test(value)
const isValidNumericId = (value) => /^\d+$/.test(value)

export default {
	data: new SlashCommandBuilder()
		.setName('warns')
		.setDescription('Gère les avertissements')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('view')
				.setDescription("Voir les avertissements d'un membre")
				.addStringOption((option) =>
					option.setName('membre').setDescription('Discord ID').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Crée un nouvel avertissement')
				.addStringOption((option) =>
					option.setName('membre').setDescription('Discord ID').setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('raison')
						.setDescription("Raison de l'avertissement")
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName('notify')
						.setDescription('Avertir le membre par message privé')
						.setRequired(true),
				)
				.addAttachmentOption((option) =>
					option.setName('preuve').setDescription("Preuve de l'avertissement"),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription('Modifie un avertissement')
				.addStringOption((option) =>
					option.setName('id').setDescription("ID de l'avertissement").setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('raison')
						.setDescription("Raison de l'avertissement")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('del')
				.setDescription('Supprime un avertissement')
				.addStringOption((option) =>
					option.setName('id').setDescription("ID de l'avertissement").setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('clear')
				.setDescription("Supprime tous les avertissements d'un membre")
				.addStringOption((option) =>
					option.setName('membre').setDescription('Discord ID').setRequired(true),
				),
		),

	interaction: async (interaction, client) => {
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration) {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		switch (interaction.options.getSubcommand()) {
			case 'view': {
				const userId = interaction.options.getString('membre').trim()

				if (!isValidDiscordId(userId)) {
					return interaction.reply({
						content: "Tu ne m'as pas donné un ID valide 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				let member = null
				try {
					member = await interaction.guild.members.fetch(userId).catch(() => null)
				} catch (error) {
					console.error(error)
				}

				let warnings = []
				try {
					const sqlView =
						'SELECT * FROM warnings_logs WHERE discord_id = ? ORDER BY timestamp DESC'
					const dataView = [userId]
					const [resultWarnings] = await bddModeration.execute(sqlView, dataView)
					warnings = resultWarnings ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des avertissements 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!warnings.length) {
					return interaction.reply({
						content: "Aucun avertissement n'a été créé pour cet utilisateur 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const fieldsEmbed = warnings.map((warning) => {
					const warnedBy = warning.executor_username || warning.executor_id || 'Inconnu'
					const warnText = `Par ${warnedBy} - ${convertDateForDiscord(
						warning.timestamp * 1000,
					)}\nRaison : ${warning.reason}${
						warning.preuve ? `\nPreuve : <${warning.preuve}>` : ''
					}`

					return {
						name: `Avertissement #${warning.id}`,
						value: warnText,
					}
				})

				const pagination = new Pagination(interaction, {
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

				pagination.setTitle(
					member
						? `Avertissements de ${displayNameAndID(member, member.user)}`
						: `Avertissements de l'ID ${userId}`,
				)
				pagination.setDescription(`**Total : ${warnings.length}**`)
				pagination.setColor('#C27C0E')
				pagination.setFields(fieldsEmbed)
				pagination.setFooter({ text: 'Page : {pageNumber} / {totalPages}' })
				pagination.paginateFields(true)

				return pagination.render()
			}

			case 'create': {
				const userId = interaction.options.getString('membre').trim()
				const reason = interaction.options.getString('raison').trim()
				const notify = interaction.options.getBoolean('notify')
				const proofAttachment = interaction.options.getAttachment('preuve')
				const preuve = proofAttachment?.url ?? proofAttachment?.attachment ?? null

				if (!isValidDiscordId(userId)) {
					return interaction.reply({
						content: "Tu ne m'as pas donné un ID valide 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				await interaction.deferReply({ flags: MessageFlags.Ephemeral })

				const targetUser = await client.users.fetch(userId).catch(() => null)
				if (!targetUser) {
					return interaction.editReply({
						content: "Je n'ai pas trouvé cet utilisateur, vérifie l'ID 😕",
					})
				}

				const member = await interaction.guild.members.fetch(userId).catch(() => null)

				try {
					const sqlCreate =
						'INSERT INTO warnings_logs (discord_id, username, avatar, executor_id, executor_username, reason, preuve, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
					const dataCreate = [
						userId,
						targetUser.username,
						targetUser.avatar ?? null,
						interaction.user.id,
						interaction.user.username,
						reason,
						preuve,
						Math.round(Date.now() / 1000),
					]

					await bddModeration.execute(sqlCreate, dataCreate)
				} catch (error) {
					console.error(error)
					return interaction.editReply({
						content:
							"Une erreur est survenue lors de la création de l'avertissement en base de données 😕",
					})
				}

				let errorDM = ''
				if (notify) {
					let warnDM = ''
					try {
						const sqlSelectWarn = 'SELECT * FROM forms WHERE name = ?'
						const dataSelectWarn = ['warn']
						const [resultSelectWarn] = await bdd.execute(sqlSelectWarn, dataSelectWarn)
						warnDM = resultSelectWarn?.[0]?.content ?? ''
					} catch (error) {
						console.error(error)
						return interaction.editReply({
							content:
								"Une erreur est survenue lors de la récupération du message d'avertissement en base de données 😕",
						})
					}

					if (!warnDM) {
						return interaction.editReply({
							content: "Le message d'avertissement est introuvable ou vide 😕",
						})
					}

					const embedWarn = new EmbedBuilder()
						.setColor('#C27C0E')
						.setTitle('Avertissement')
						.setDescription(warnDM)
						.setAuthor({
							name: interaction.guild.name,
							iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
							url: interaction.guild.vanityURL ?? undefined,
						})
						.addFields({
							name: 'Raison',
							value: reason,
						})

					try {
						await targetUser.send({
							embeds: [embedWarn],
						})
					} catch (error) {
						console.error(error)
						errorDM =
							"\n\nℹ️ Le message privé n'a pas été envoyé car le membre les a bloqués"
					}
				}

				return interaction.editReply({
					content: `⚠️ \`${targetUser.tag}\` a reçu un avertissement\n\nRaison : ${reason}\n\nNotification en message privé : ${
						notify ? 'Oui' : 'Non'
					}${errorDM}${preuve ? `\n\nPreuve : <${preuve}>` : ''}${
						!member ? "\n\nℹ️ Le membre n'est plus présent sur le serveur." : ''
					}`,
				})
			}

			case 'edit': {
				const warnId = interaction.options.getString('id').trim()
				const reasonEdit = interaction.options.getString('raison').trim()

				if (!isValidNumericId(warnId)) {
					return interaction.reply({
						content: "Tu ne m'as pas donné un ID d'avertissement valide 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				let warning = null
				try {
					const sqlSelect = 'SELECT * FROM warnings_logs WHERE id = ?'
					const dataSelect = [warnId]
					const [resultSelect] = await bddModeration.execute(sqlSelect, dataSelect)
					warning = resultSelect?.[0] ?? null
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la récupération de l'avertissement en base de données 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!warning) {
					return interaction.reply({
						content: "L'avertissement n'existe pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (warning.executor_id !== interaction.user.id) {
					return interaction.reply({
						content: "L'avertissement ne t'appartient pas 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sqlEdit = 'UPDATE warnings_logs SET reason = ? WHERE id = ?'
					const dataEdit = [reasonEdit, warnId]
					const [resultEdit] = await bddModeration.execute(sqlEdit, dataEdit)

					if (resultEdit.affectedRows === 1) {
						return interaction.reply({
							content: "L'avertissement a bien été modifié 👌",
							flags: MessageFlags.Ephemeral,
						})
					}
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la modification de l'avertissement en base de données 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content:
						"Une erreur est survenue lors de la modification de l'avertissement 😬",
					flags: MessageFlags.Ephemeral,
				})
			}

			case 'del': {
				const warnId = interaction.options.getString('id').trim()

				if (!isValidNumericId(warnId)) {
					return interaction.reply({
						content: "Tu ne m'as pas donné un ID d'avertissement valide 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				let deletedWarn = null
				try {
					const sqlDelete = 'DELETE FROM warnings_logs WHERE id = ?'
					const dataDelete = [warnId]
					const [resultDelete] = await bddModeration.execute(sqlDelete, dataDelete)
					deletedWarn = resultDelete
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							"Une erreur est survenue lors de la suppression de l'avertissement en base de données 😬",
						flags: MessageFlags.Ephemeral,
					})
				}

				if (deletedWarn.affectedRows === 1) {
					return interaction.reply({
						content: "L'avertissement a bien été supprimé 👌",
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: "L'avertissement n'existe pas 😬",
					flags: MessageFlags.Ephemeral,
				})
			}

			case 'clear': {
				const discordId = interaction.options.getString('membre').trim()

				if (!isValidDiscordId(discordId)) {
					return interaction.reply({
						content: "Tu ne m'as pas donné un ID valide 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				let deletedWarns = []
				try {
					const sqlSelect = 'SELECT * FROM warnings_logs WHERE discord_id = ?'
					const dataSelect = [discordId]
					const [resultSelect] = await bddModeration.execute(sqlSelect, dataSelect)
					deletedWarns = resultSelect ?? []
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la récupération des avertissements en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				if (!deletedWarns.length) {
					return interaction.reply({
						content: "Ce membre n'a pas d'avertissements 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				try {
					const sqlDeleteAll = 'DELETE FROM warnings_logs WHERE discord_id = ?'
					const dataDeleteAll = [discordId]
					await bddModeration.execute(sqlDeleteAll, dataDeleteAll)
				} catch (error) {
					console.error(error)
					return interaction.reply({
						content:
							'Une erreur est survenue lors de la suppression des avertissements en base de données 😬',
						flags: MessageFlags.Ephemeral,
					})
				}

				return interaction.reply({
					content: 'Les avertissements ont bien été supprimés 👌',
					flags: MessageFlags.Ephemeral,
				})
			}
		}
	},
}
