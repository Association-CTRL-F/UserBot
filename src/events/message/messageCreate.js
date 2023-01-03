/* eslint-disable default-case */
/* eslint-disable no-case-declarations */
import { Collection, GuildMember, EmbedBuilder, RESTJSONErrorCodes } from 'discord.js'
import {
	modifyWrongUsernames,
	convertDate,
	isImage,
	getFileInfos,
	displayNameAndID,
	isStaffMember,
	convertDateForDiscord,
	diffDate,
} from '../../util/util.js'

export default async (message, client) => {
	if (message.author.bot || !message.guild || !message.guild.available) return

	if (message.partial) await message.fetch()

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	// Acquisition des paramètres de la guild
	let configGuild = {}
	try {
		const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
		const dataSelect = [message.guild.id]
		const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
		configGuild = resultSelect[0]
	} catch (error) {
		return console.log(error)
	}

	// Si le message vient d'une guild, on vérifie
	if (message.member) {
		// Si le pseudo respecte bien les règles
		modifyWrongUsernames(message.member).catch(() => null)

		if (configGuild.BLABLA_CHANNEL_ID && configGuild.JOIN_ROLE_ID)
			if (
				message.channel.id !== configGuild.BLABLA_CHANNEL_ID &&
				message.member.roles.cache.has(configGuild.JOIN_ROLE_ID)
			)
				// Si c'est un salon autre que blabla
				message.member.roles.remove(configGuild.JOIN_ROLE_ID).catch(error => {
					if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
				})
	}

	// Automod //

	// Acquisition du salon de logs liste-ban
	const logsChannel = message.guild.channels.cache.get(configGuild.LOGS_BANS_CHANNEL_ID)
	if (!logsChannel) return

	// Partie domaines
	const staffRoles = configGuild.STAFF_ROLES_MANAGER_IDS
		? configGuild.STAFF_ROLES_MANAGER_IDS.split(/, */)
		: []

	if (!isStaffMember(message.member, staffRoles)) {
		let domains = []
		try {
			const sqlDomains = 'SELECT * FROM automod_domains WHERE guildId = ?'
			const dataDomains = [configGuild.GUILD_ID]
			const [resultsDomains] = await bdd.execute(sqlDomains, dataDomains)
			domains = resultsDomains
		} catch (error) {
			return console.error(error)
		}

		if (domains.length > 0) {
			let isBlacklisted = 0

			const sentMessage = await message.fetch().catch(() => false)

			let guildMember = {}
			if (message.guild)
				guildMember = await message.guild.members
					.fetch(sentMessage.author)
					.catch(() => false)

			if (!sentMessage || !guildMember) return

			domains.forEach(async domain => {
				const regexDomain = String.raw`(http[s]?:\/\/)?(www\.)?((${domain.domain})[\w]*){1}\.([a-z]{2,})`

				const matchesRegex = message.content.match(regexDomain)
				if (!matchesRegex) return

				isBlacklisted += 1
				await sentMessage.delete()
			})

			if (isBlacklisted > 0) {
				// Acquisition du message de bannissement
				let banDM = ''
				try {
					const sqlSelectBan = 'SELECT * FROM forms WHERE name = ? AND guildId = ?'
					const dataSelectBan = ['ban', configGuild.GUILD_ID]
					const [resultSelectBan] = await bdd.execute(sqlSelectBan, dataSelectBan)

					banDM = resultSelectBan[0].content
				} catch {
					return console.log(
						'Une erreur est survenue lors de la récupération du message de bannissement en base de données (Automod)',
					)
				}

				// Envoi du message de bannissement en message privé
				const embed = new EmbedBuilder()
					.setColor('#C27C0E')
					.setTitle('Bannissement')
					.setDescription(banDM)
					.setAuthor({
						name: sentMessage.guild.name,
						iconURL: sentMessage.guild.iconURL({ dynamic: true }),
						url: sentMessage.guild.vanityURL,
					})
					.addFields([
						{
							name: 'Raison du bannissement',
							value: 'Scam Nitro / Steam (Automod)',
						},
					])

				const DMMessageBan = await guildMember
					.send({
						embeds: [embed],
					})
					.catch(error => {
						console.error(error)
					})

				// Ban du membre
				const banAction = await guildMember
					.ban({
						deleteMessageSeconds: 604800,
						reason: `${client.user.tag} : Scam Nitro / Steam (Automod)`,
					})
					.catch(error => {
						// Suppression du message privé envoyé
						// car action de bannissement non réalisée
						if (DMMessageBan) DMMessageBan.delete()

						if (error.code === RESTJSONErrorCodes.MissingPermissions)
							return console.log(
								"Je n'ai pas les permissions pour bannir ce membre (Automod)",
							)

						console.error(error)
						return console.log(
							'Une erreur est survenue lors du bannissement du membre (Automod)',
						)
					})

				// Si pas d'erreur, réaction avec 🚪 pour confirmer le ban
				if (banAction instanceof GuildMember) {
					// Création de l'embed
					const logEmbed = new EmbedBuilder()
						.setColor('C9572A')
						.setAuthor({
							name: displayNameAndID(banAction, banAction),
							iconURL: banAction.displayAvatarURL({ dynamic: true }),
						})
						.setDescription(
							`\`\`\`\n${client.user.tag} : Scam Nitro / Steam (Automod)\`\`\``,
						)
						.addFields([
							{
								name: 'Mention',
								value: banAction.toString(),
								inline: true,
							},
							{
								name: 'Date de création du compte',
								value: convertDateForDiscord(banAction.user.createdAt),
								inline: true,
							},
							{
								name: 'Âge du compte',
								value: diffDate(banAction.user.createdAt),
								inline: true,
							},
						])
						.setFooter({
							iconURL: banAction.user.displayAvatarURL({ dynamic: true }),
							text: `Membre banni par ${banAction.user.tag}`,
						})
						.setTimestamp(new Date())

					return logsChannel.send({ embeds: [logEmbed] })
				}

				if (banAction instanceof Error || DMMessageBan instanceof Error)
					// Si au moins une erreur, throw
					throw new Error(
						"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
					)
			}
		}
	}

	// Partie règles

	// Acquisition des règles depuis la base de données
	let rules = []
	try {
		const sqlRules = 'SELECT * FROM automod_rules WHERE guildId = ?'
		const dataRules = [configGuild.GUILD_ID]
		const [resultsRules] = await bdd.execute(sqlRules, dataRules)
		rules = resultsRules
	} catch (error) {
		return console.error(error)
	}

	// Boucle sur les règles
	if (rules.length > 0) {
		let hasIgnoredRole = 0
		rules.forEach(async rule => {
			const ignoredRoles = rule.ignoredRoles.split(',')

			try {
				ignoredRoles.forEach(ignoredRole => {
					message.member.roles.cache.forEach(role => {
						if (role.name === '@everyone') return
						if (role.id === ignoredRole) hasIgnoredRole += 1
					})
				})
			} catch (error) {
				return console.log(error)
			}

			if (hasIgnoredRole === 0) {
				const regexRule = rule.regex

				// Vérification si le message envoyé match avec la regex
				const matchesRegex = message.content.match(regexRule)
				if (!matchesRegex) return

				const sentMessage = await message.fetch().catch(() => false)

				let guildMember = {}
				if (message.guild)
					guildMember = await message.guild.members
						.fetch(sentMessage.author)
						.catch(() => false)

				if (!sentMessage || !guildMember) return

				await message.delete()

				// Switch sur les types de règles
				switch (rule.type) {
					case 'ban':
						// Acquisition du message de bannissement
						let banDM = ''
						try {
							const sqlSelectBan =
								'SELECT * FROM forms WHERE name = ? AND guildId = ?'
							const dataSelectBan = ['ban', configGuild.GUILD_ID]
							const [resultSelectBan] = await bdd.execute(sqlSelectBan, dataSelectBan)

							banDM = resultSelectBan[0].content
						} catch {
							return console.log(
								'Une erreur est survenue lors de la récupération du message de bannissement en base de données (Automod)',
							)
						}

						// Envoi du message de bannissement en message privé
						const embedBan = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Bannissement')
							.setDescription(banDM)
							.setAuthor({
								name: sentMessage.guild.name,
								iconURL: sentMessage.guild.iconURL({ dynamic: true }),
								url: sentMessage.guild.vanityURL,
							})
							.addFields([
								{
									name: 'Raison du bannissement',
									value: rule.reason,
								},
							])

						const DMMessageBan = await guildMember
							.send({
								embeds: [embedBan],
							})
							.catch(error => {
								console.error(error)
							})

						// Ban du membre
						const banAction = await guildMember
							.ban({
								deleteMessageSeconds: 0,
								reason: `${client.user.tag} : ${rule.reason}`,
							})
							.catch(error => {
								// Suppression du message privé envoyé
								// car action de bannissement non réalisée
								if (DMMessageBan) DMMessageBan.delete()

								if (error.code === RESTJSONErrorCodes.MissingPermissions)
									return console.log(
										"Je n'ai pas les permissions pour bannir ce membre (Automod)",
									)

								console.error(error)
								return console.log(
									'Une erreur est survenue lors du bannissement du membre (Automod)',
								)
							})

						// Si pas d'erreur,
						// réaction avec 🚪 pour confirmer le ban
						if (banAction instanceof GuildMember) {
							// Création de l'embed
							const logEmbed = new EmbedBuilder()
								.setColor('C9572A')
								.setAuthor({
									name: displayNameAndID(banAction, banAction),
									iconURL: banAction.displayAvatarURL({ dynamic: true }),
								})
								.setDescription(
									`\`\`\`\n${client.user.tag} : Scam Nitro / Steam (Automod)\`\`\``,
								)
								.addFields([
									{
										name: 'Mention',
										value: banAction.toString(),
										inline: true,
									},
									{
										name: 'Date de création du compte',
										value: convertDateForDiscord(banAction.user.createdAt),
										inline: true,
									},
									{
										name: 'Âge du compte',
										value: diffDate(banAction.user.createdAt),
										inline: true,
									},
								])
								.setFooter({
									iconURL: banAction.user.displayAvatarURL({ dynamic: true }),
									text: `Membre banni par ${banAction.user.tag}`,
								})
								.setTimestamp(new Date())

							return logsChannel.send({ embeds: [logEmbed] })
						}

						// Si au moins une erreur, throw
						if (banAction instanceof Error || DMMessageBan instanceof Error)
							throw new Error(
								"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
							)

						return

					case 'warn':
						// Création de l'avertissement en base de données
						try {
							const sqlCreate =
								'INSERT INTO warnings (guildId, discordID, warnedBy, warnReason, warnedAt) VALUES (?, ?, ?, ?, ?)'
							const dataCreate = [
								configGuild.GUILD_ID,
								guildMember.user.id,
								client.user.id,
								rule.reason,
								Math.round(Date.now() / 1000),
							]

							await bdd.execute(sqlCreate, dataCreate)
						} catch (error) {
							return console.log(
								"Une erreur est survenue lors de la création de l'avertissement Automod en base de données (Automod)",
							)
						}

						// Lecture du message d'avertissement
						let warnDM = ''
						try {
							const sqlSelectWarn =
								'SELECT * FROM forms WHERE name = ? AND guildId = ?'
							const dataSelectWarn = ['warn', configGuild.GUILD_ID]
							const [resultSelectWarn] = await bdd.execute(
								sqlSelectWarn,
								dataSelectWarn,
							)
							warnDM = resultSelectWarn[0].content
						} catch (error) {
							return console.log(
								"Une erreur est survenue lors de la récupération du message d'avertissement en base de données (Automod)",
							)
						}

						// Envoi du message d'avertissement en message privé
						const embedWarn = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Avertissement')
							.setDescription(warnDM)
							.setAuthor({
								name: sentMessage.guild.name,
								iconURL: sentMessage.guild.iconURL({ dynamic: true }),
								url: sentMessage.guild.vanityURL,
							})
							.addFields([
								{
									name: "Raison de l'avertissement",
									value: rule.reason,
								},
							])

						const DMMessageWarn = await guildMember
							.send({
								embeds: [embedWarn],
							})
							.catch(error => {
								console.error(error)
							})

						// Si au moins une erreur, throw
						if (DMMessageWarn instanceof Error)
							throw new Error(
								"L'envoi d'un message a échoué. Voir les logs précédents pour plus d'informations.",
							)
				}
			}
		})
	}

	// Fin Automod

	// Si c'est un salon no-text
	const NOTEXT = configGuild.NOTEXT_MANAGER_CHANNELS_IDS
		? configGuild.NOTEXT_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (NOTEXT.includes(message.channel.id) && message.attachments.size < 1) {
		const sentMessage = await message.channel.send(
			`<@${message.author.id}>, tu dois mettre une image / vidéo 😕`,
		)
		return Promise.all([
			await message.delete().catch(() => false),
			setTimeout(
				() =>
					sentMessage.delete().catch(error => {
						if (error.code !== RESTJSONErrorCodes.UnknownMessage) console.error(error)
					}),
				// Suppression après 7 secondes
				7 * 1000,
			),
		])
	}

	// Si c'est un salon auto-thread
	const THREADS = configGuild.THREADS_MANAGER_CHANNELS_IDS
		? configGuild.THREADS_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (THREADS.includes(message.channel.id)) {
		await message.react('⬆️')
		await message.react('⬇️')
		await message.react('💬')
	}

	// Répondre émoji si @bot
	if (message.mentions.users.has(client.user.id)) {
		const pingEmoji = client.emojis.cache.find(emoji => emoji.name === 'ping')
		if (pingEmoji) message.react(pingEmoji)
	}

	// Command handler
	if (message.content.startsWith(configGuild.COMMANDS_PREFIX)) {
		const regexCommands = `${configGuild.COMMANDS_PREFIX}([a-zA-Z0-9]+)(?: .*|$)`

		const args = message.content.match(regexCommands)
		if (!args) return

		const commandName = args[1].toLowerCase()
		if (!commandName) return

		// Vérification si la commande existe et est activée
		const sqlCheckName = `SELECT * FROM commands WHERE guildId = ? AND name = ? OR aliases REGEXP ?`
		const dataCheckName = [configGuild.GUILD_ID, commandName, `(?:^|,)(${commandName})(?:,|$)`]
		const [rowsCheckName] = await bdd.execute(sqlCheckName, dataCheckName)

		if (!rowsCheckName[0]) return

		if (!rowsCheckName[0].active) return

		// Partie cooldown
		if (!client.cooldowns.has(commandName))
			client.cooldowns.set(rowsCheckName[0].name, new Collection())
		const now = Date.now()
		const timestamps = client.cooldowns.get(rowsCheckName[0].name)
		const cooldownAmount = (rowsCheckName[0].cooldown || 4) * 1000
		if (timestamps.has(message.author.id)) {
			const expirationTime = timestamps.get(message.author.id) + cooldownAmount
			if (now < expirationTime) {
				const timeLeft = expirationTime - now
				const sentMessage = await message.reply({
					content: `Merci d'attendre ${(timeLeft / 1000).toFixed(
						1,
					)} seconde(s) de plus avant de réutiliser la commande **${
						rowsCheckName[0].name
					}** 😬`,
				})

				// Suppression du message
				return client.cache.deleteMessagesID.add(sentMessage.id)
			}
		}
		timestamps.set(message.author.id, now)
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)

		// Exécution de la commande
		try {
			const sql =
				'UPDATE commands SET numberOfUses = numberOfUses + 1 WHERE name = ? AND guildId = ?'
			const data = [commandName, configGuild.GUILD_ID]
			await bdd.execute(sql, data)

			return message.channel.send(rowsCheckName[0].content)
		} catch (error) {
			message.reply({ content: 'Il y a eu une erreur en exécutant la commande 😬' })
		}
	}

	// Partie citation
	if (message.guild) {
		// Regex pour match les liens Discord
		const regexGlobal =
			/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/g
		const regex =
			/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/

		// Suppression des lignes en citations, pour ne pas afficher la citation
		const matches = message.content.match(regexGlobal)
		if (!matches) return

		const validMessages = (
			await Promise.all(
				// Filtre les liens mennant vers une autre guild
				// ou sur un salon n'existant pas sur la guild
				matches
					.reduce((acc, match) => {
						const [, guildId, channelId, messageId] = regex.exec(match)
						if (guildId !== message.guild.id) return acc

						const foundChannel = message.guild.channels.cache.get(channelId)
						if (!foundChannel) return acc

						// Ignore la citation si le lien est entouré de <>
						if (match.startsWith('<') && match.endsWith('>')) return acc

						acc.push({ messageId, foundChannel })

						return acc
					}, [])
					// Fetch du message et retourne de celui-ci s'il existe
					.map(async ({ messageId, foundChannel }) => {
						const foundMessage = await foundChannel.messages
							.fetch(messageId)
							.catch(() => null)
						// On ne fait pas la citation si le
						// message n'a ni contenu écrit ni attachments
						if (
							!foundMessage ||
							(!foundMessage.content && !foundMessage.attachments.size)
						)
							return

						return foundMessage
					}),
			)
		)
			// Suppression des messages invalides
			.filter(Boolean)

		const sentMessages = validMessages.map(validMessage => {
			const embed = new EmbedBuilder()
				.setColor('2F3136')
				.setAuthor({
					name: `${displayNameAndID(validMessage.member, validMessage.author)}`,
					iconURL: validMessage.author.displayAvatarURL({ dynamic: true }),
				})
				.setFooter({
					text: `Message posté le ${convertDate(validMessage.createdAt)}`,
				})

			const description = `${validMessage.content}\n[Aller au message](${validMessage.url}) - ${validMessage.channel}`

			// Si la description dépasse la limite
			// autorisée, les liens sont contenus dans des fields
			if (description.length > 4096) {
				embed.data.description = validMessage.content
				embed.addFields([
					{
						name: 'Message',
						value: `[Aller au message](${validMessage.url})`,
						inline: true,
					},
					{
						name: 'Salon',
						value: validMessage.channel.toString(),
						inline: true,
					},
				])
			} else {
				embed.data.description = description
			}

			if (validMessage.editedAt)
				embed.data.footer.text += `\nModifié le ${convertDate(validMessage.editedAt)}`

			if (message.author !== validMessage.author) {
				embed.data.footer.icon_url = message.author.displayAvatarURL({ dynamic: true })
				embed.data.footer.text += `\nCité par ${displayNameAndID(
					message.member,
					message.author,
				)} le ${convertDate(message.createdAt)}`
			}

			// Partie pour gérer les attachments
			const attachments = validMessage.attachments
			if (attachments.size === 1 && isImage(attachments.first().name))
				embed.data.image = { url: attachments.first().url }
			else
				attachments.forEach(attachment => {
					const { name, type } = getFileInfos(attachment.name)
					embed.addFields([
						{
							name: `Fichier ${type}`,
							value: `[${name}](${attachment.url})`,
							inline: true,
						},
					])
				})

			return message.channel.send({ embeds: [embed] })
		})

		// Si le message ne contient que un(des) lien(s),
		// on supprime le message, ne laissant que les embeds
		if (
			!message.content.replace(regexGlobal, '').trim() &&
			sentMessages.length === matches.length &&
			!message.mentions.repliedUser
		) {
			client.cache.deleteMessagesID.add(message.id)
			return message.delete()
		}
	}
}
