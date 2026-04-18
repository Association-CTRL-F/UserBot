import mysql from 'mysql2/promise'

const DEFAULT_TIMEZONE = process.env.TIMEZONE || 'Europe/Paris'

const ensureString = (value) => {
	if (typeof value !== 'string') {
		throw new TypeError('Expected a string')
	}

	return value
}

const formatDuration = (totalSeconds, { withSeconds = true } = {}) => {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds))

	const days = Math.floor(safeSeconds / 86400)
	const hours = Math.floor((safeSeconds % 86400) / 3600)
	const minutes = Math.floor((safeSeconds % 3600) / 60)
	const seconds = safeSeconds % 60

	const parts = []

	if (days) parts.push(pluralize('jour', days))
	if (hours) parts.push(pluralize('heure', hours))
	if (minutes) parts.push(pluralize('minute', minutes))
	if (withSeconds && seconds) parts.push(pluralize('seconde', seconds))

	return parts.join(' ')
}

/**
 * Gère l'ajout de "s" à la fin d'un mot en fonction de la quantité
 * @param {string} word
 * @param {number} quantity
 * @param {boolean} isAlwaysPlural
 * @returns {string}
 */
export const pluralize = (word, quantity, isAlwaysPlural = false) => {
	if (quantity === 0) return ''

	if (isAlwaysPlural) return `${quantity} ${word}`

	return `${quantity} ${word}${quantity > 1 ? 's' : ''}`
}

/**
 * Gère l'ajout de "s" à la fin d'un mot en fonction de la quantité
 * sans inclure la quantité dans le résultat
 * @param {string} word
 * @param {number} quantity
 * @param {boolean} isAlwaysPlural
 * @returns {string}
 */
export const pluralizeWithoutQuantity = (word, quantity, isAlwaysPlural = false) => {
	if (quantity === 0) return ''

	if (isAlwaysPlural) return word

	return `${word}${quantity > 1 ? 's' : ''}`
}

/**
 * Convertit la date au format lisible FR
 * @param {Date | number | string} date
 * @returns {string}
 */
export const convertDate = (date) =>
	new Intl.DateTimeFormat('fr-FR', {
		timeZone: DEFAULT_TIMEZONE,
		year: 'numeric',
		month: 'long',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).format(new Date(date))

/**
 * Retourne le temps écoulé depuis une date
 * @param {Date | number | string} date
 * @returns {string}
 */
export const diffDate = (date) => {
	const diff = Date.now() - new Date(date).getTime()

	const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.4375 * 12))
	const months = Math.floor((diff / (1000 * 60 * 60 * 24 * 30.4375)) % 12)
	const days = Math.floor(((diff / (1000 * 60 * 60 * 24)) % 365.25) % 30.4375)
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

	const parts = []

	if (years) parts.push(pluralize('année', years))
	if (months) parts.push(pluralize('mois', months, true))
	if (days) parts.push(pluralize('jour', days))
	if (hours) parts.push(pluralize('heure', hours))
	if (minutes) parts.push(pluralize('minute', minutes))

	return parts.length ? parts.join(' ') : "Il y a moins d'une minute"
}

/**
 * Convertit des millisecondes au format lisible
 * @param {number} msInput
 * @returns {string}
 */
export const convertMsToString = (msInput) => formatDuration(msInput / 1000)

/**
 * Convertit des secondes au format lisible
 * @param {number} secondsInput
 * @returns {string}
 */
export const convertSecondsToString = (secondsInput) => formatDuration(secondsInput)

/**
 * Convertit des minutes au format lisible
 * @param {number} minutesInput
 * @returns {string}
 */
export const convertMinutesToString = (minutesInput) =>
	formatDuration(minutesInput * 60, { withSeconds: false })

/**
 * Vérifie si un fichier est une image
 * @param {string} fileName
 * @returns {boolean}
 */
export const isImage = (fileName) => /\.(png|jpe?g|gif|webp)$/i.test(fileName)

/**
 * Renomme l'utilisateur si son pseudo contient des caractères indésirables
 * @param {import('discord.js').GuildMember} guildMember
 * @returns {Promise<import('discord.js').GuildMember | void>}
 */
export const modifyWrongUsernames = (guildMember) => {
	const triggerRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 _-]+$/u

	if (!triggerRegex.test(guildMember.displayName)) {
		return guildMember.setNickname(guildMember.user.username)
	}

	return Promise.resolve()
}

/**
 * Enlève l'extension d'un fichier
 * @param {string} fileName
 * @returns {string}
 */
export const removeFileExtension = (fileName) => {
	const fileArray = fileName.split('.')
	fileArray.pop()
	return fileArray.join('.')
}

/**
 * Retourne le type du fichier et son nom
 * @param {string} file
 * @returns {{ name: string, type: string }}
 */
export const getFileInfos = (file) => {
	const fileNameSplitted = file.split('.')
	const fileType = fileNameSplitted.pop() || ''

	return {
		name: fileNameSplitted.join('.'),
		type: fileType,
	}
}

/**
 * Divise une chaîne en plusieurs morceaux qui ne dépassent pas maxLength
 * @param {string} text
 * @param {{ maxLength?: number, char?: string | RegExp | Array<string | RegExp>, prepend?: string, append?: string }} [options]
 * @returns {string[]}
 */
export const splitMessage = (
	text,
	{ maxLength = 2000, char = '\n', prepend = '', append = '' } = {},
) => {
	text = ensureString(text)

	if (text.length <= maxLength) return [text]

	let splitText = [text]

	if (Array.isArray(char)) {
		const charStack = [...char]

		while (charStack.length > 0 && splitText.some((element) => element.length > maxLength)) {
			const currentChar = charStack.shift()

			if (currentChar instanceof RegExp) {
				splitText = splitText.flatMap((chunk) => chunk.match(currentChar) ?? [chunk])
			} else {
				splitText = splitText.flatMap((chunk) => chunk.split(currentChar))
			}
		}
	} else if (char instanceof RegExp) {
		splitText = text.match(char) ?? [text]
	} else {
		splitText = text.split(char)
	}

	if (splitText.some((element) => element.length > maxLength)) {
		throw new RangeError('SPLIT_MAX_LEN')
	}

	const messages = []
	let message = ''

	for (const chunk of splitText) {
		if (message && (message + char + chunk + append).length > maxLength) {
			messages.push(message + append)
			message = prepend
		}

		message += `${message && message !== prepend ? char : ''}${chunk}`
	}

	return messages.concat(message).filter(Boolean)
}

/**
 * Formate le pseudo et l'ID de l'utilisateur
 * @param {import('discord.js').GuildMember | null | undefined} guildMember
 * @param {import('discord.js').User | null | undefined} [user]
 * @returns {string}
 */
export const displayNameAndID = (guildMember, user = guildMember?.user) => {
	if (guildMember?.user) {
		return `${guildMember.displayName} (ID : ${guildMember.user.id})`
	}

	if (user?.username) {
		return `${user.username} (ID : ${user.id})`
	}

	return '?'
}

/**
 * Ferme proprement l'application
 * @param {'SIGINT' | 'SIGTERM'} signal
 * @param {import('discord.js').Client} client
 */
export const closeGracefully = (signal, client) => {
	console.log(`Received signal to terminate : ${signal}`)

	client.destroy()
	console.log('Discord client successfully destroyed')

	process.exit(0)
}

/**
 * Convertit une date au format timestamp Discord
 * @param {Date | number | string} date
 * @param {boolean} relative
 * @returns {string}
 */
export const convertDateForDiscord = (date, relative = false) => {
	const timestamp = Math.round(new Date(date).getTime() / 1000)
	return relative ? `<t:${timestamp}:R>` : `<t:${timestamp}>`
}

/**
 * Crée une chaîne alphanumérique aléatoire
 * @param {number} length
 * @returns {string}
 */
export const randomString = (length) => {
	let string = ''
	const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	const charactersLength = characters.length

	for (let index = 0; index < length; index += 1) {
		string += characters.charAt(Math.floor(Math.random() * charactersLength))
	}

	return string
}

/**
 * Crée un pool de connexion à la base de données
 * @param {{ dbHost: string, dbUser: string, dbPass: string, dbName: string }} config
 * @returns {Promise<import('mysql2/promise').Pool>}
 */
export const pool = async ({ dbHost, dbUser, dbPass, dbName }) => {
	const createdPool = mysql.createPool({
		host: dbHost,
		user: dbUser,
		password: dbPass,
		database: dbName,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
	})

	const connection = await createdPool.getConnection()
	connection.release()

	return createdPool
}
