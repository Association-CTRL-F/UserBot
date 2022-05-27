/* eslint-disable no-unused-vars */
/* eslint-disable max-len */

import { GuildMember, Client, User } from 'discord.js'
import mysql from 'mysql2'

/**
 * Gère l'ajout de "s" à la fin d'un mot en fonction de la quantité
 * @param {string} word mot
 * @param {number} quantity quantité
 * @param {boolean} isAlwaysPlural si le mot est toujours au pluriel ou non
 * @returns un string vide si la quantité est nulle, sinon le mot avec la quantité
 * @example pluralize(année, 4) => '4 années'
 * 			pluralize(année, 1) => '1 année'
 * 			pluralize(pomme, 0) => ''
 * 			pluralize(mois, 4, true) => '4 mois'
 */
export const pluralize = (word, quantity, isAlwaysPlural = false) => {
	if (quantity === 0) return ''
	else if (isAlwaysPlural) return `${quantity} ${word}`
	return `${quantity} ${word}${quantity > 1 ? 's' : ''}`
}

/**
 * Gère l'ajout de "s" à la fin d'un mot en fonction de la quantité
 * @param {string} word mot
 * @param {number} quantity quantité
 * @param {boolean} isAlwaysPlural si le mot est toujours au pluriel ou non
 * @returns un string vide si la quantité est nulle, sinon le mot sans la quantité
 * @example pluralize(année, 4) => 'années'
 * 			pluralize(année, 1) => 'année'
 * 			pluralize(pomme, 0) => ''
 * 			pluralize(mois, 4, true) => 'mois'
 */
export const pluralizeWithoutQuantity = (word, quantity, isAlwaysPlural = false) => {
	if (quantity === 0) return ''
	else if (isAlwaysPlural) return `${quantity} ${word}s`
	return `${word}${quantity > 1 ? 's' : ''}`
}

/**
 * Converti la date sous un format DD/MM/YYYY HH:MM:SS
 * @param {Date} date
 * @returns date sous un format DD/MM/YYYY HH:MM:SS
 * @example convertDate(new Date('15 Nov 2020 14:24:39')) => '15/11/2020 14:24:39'
 */
export const convertDate = date =>
	new Intl.DateTimeFormat('fr-FR', {
		timeZone: process.env.TIMEZONE,
		year: 'numeric',
		month: 'long',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date)

/**
 * Converti la date sous un format Y années M mois D jours H heures M minutes
 * @param {Date} date
 * @returns date sous un format Y années M mois D jours H heures M minutes ou "Il y a moins d'une minute"
 * @example diffDate(new Date('26 Oct 2015 12:24:29')) => '5 années 20 jours 2 heures 19 minutes'
 */
export const diffDate = date => {
	const diff = new Date() - date
	const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.4375 * 12))
	const months = Math.floor((diff / (1000 * 60 * 60 * 24 * 30.4375)) % 12)
	const days = Math.floor(((diff / (1000 * 60 * 60 * 24)) % 365.25) % 30.4375)
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

	const total = []
	if (years) total.push(pluralize('année', years))
	if (months) total.push(pluralize('mois', months, true))
	if (days) total.push(pluralize('jour', days))
	if (hours) total.push(pluralize('heure', hours))
	if (minutes) total.push(pluralize('minute', minutes))

	if (!total.length) return "Il y a moins d'une minute"

	return total.join(' ')
}

/**
 * Converti un nombre de millisecondes au format J jours H heures M minutes
 * @param {Number} msInput nombre de millisecondes à convertir
 * @returns nombre de millisecondes au format J jours H heures M minutes
 * @example convertMsToString(123) => '2 heures 3 minutes'
 */
export const convertMsToString = msInput => {
	const date = new Date(0, 0, 0, 0, 0, 0, msInput)
	const days = date.getDay()
	const hours = date.getHours()
	const minutes = date.getMinutes()
	const seconds = date.getSeconds()

	const total = []
	if (days) total.push(pluralize('jour', days))
	if (hours) total.push(pluralize('heure', hours))
	if (minutes) total.push(pluralize('minute', minutes))
	if (seconds) total.push(pluralize('seconde', seconds))

	return total.join(' ')
}

/**
 * Converti un nombre de secondes au format J jours H heures M minutes S secondes
 * @param {Number} secondsInput nombre de secondes à convertir
 * @returns nombre de secondes au format J jours H heures M minutes S secondes
 * @example convertSecondsToString(8590) => '2 heures 23 minutes 10 secondes'
 */
export const convertSecondsToString = secondsInput => {
	const date = new Date(0, 0, 0, 0, 0, secondsInput, 0)
	const days = date.getDay()
	const hours = date.getHours()
	const minutes = date.getMinutes()
	const seconds = date.getSeconds()

	const total = []
	if (days) total.push(pluralize('jour', days))
	if (hours) total.push(pluralize('heure', hours))
	if (minutes) total.push(pluralize('minute', minutes))
	if (seconds) total.push(pluralize('seconde', seconds))

	return total.join(' ')
}

/**
 * Converti un nombre de minutes au format J jours H heures M minutes
 * @param {Number} minutesInput nombre de minutes à convertir
 * @returns nombre de minutes au format J jours H heures M minutes
 * @example convertMinutesToString(123) => '2 heures 3 minutes'
 */
export const convertMinutesToString = minutesInput => {
	const date = new Date(0, 0, 0, 0, minutesInput, 0, 0)
	const days = date.getDay()
	const hours = date.getHours()
	const minutes = date.getMinutes()

	const total = []
	if (days) total.push(pluralize('jour', days))
	if (hours) total.push(pluralize('heure', hours))
	if (minutes) total.push(pluralize('minute', minutes))

	return total.join(' ')
}

/**
 * Check si le fichier est une image (extensions de type png, jpeg, jpg, gif, webp)
 * @param {string} fileName nom du fichier
 * @returns true si le fichier est une image, sinon false
 * @example isImage('image.png') => true
 * 			isImage('document.pdf') => false
 */
export const isImage = fileName => {
	const format = fileName.split('.').pop().toLowerCase()
	return Boolean(format.match(/png|jpeg|jpg|gif|webp/))
}

/**
 * Renomme l'utilisateur si son pseudo commence par un caractère spécial
 * @param {GuildMember} guildMember
 * @returns promesse de la modification du pseudo ou une promesse résolue
 */
export const modifyWrongUsernames = guildMember => {
	// Trigger si le premier caractère n'est pas "normal" ou s'il vaut "Change ton pseudo"
	const triggerRegex = /^[^a-zA-Z0-9áàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ].*/

	// Si le pseudo a déjà été changé
	if (guildMember.nickname === 'Change ton pseudo') {
		// Si son pseudo d'utilisateur est correct, on le supprime
		if (!guildMember.user.username.match(triggerRegex)) return guildMember.setNickname(null)
		// Sinon, il garde "Change ton pseudo"
		return Promise.resolve()
	}

	// Si son nom de compte ou son pseudo est incorrect
	if (guildMember.displayName.match(triggerRegex)) {
		// Si son nom de compte est correct, on enlève son pseudo
		if (!guildMember.user.username.match(triggerRegex)) return guildMember.setNickname(null)
		// Sinon on le renomme "Change ton pseudo"
		return guildMember.setNickname('Change ton pseudo')
	}

	return Promise.resolve()
}

/**
 * Enlève l'extension d'un fichier
 * @param {string} fileName nom du fichier
 * @returns le nom du fichier sans son extension
 * @example removeFileExtension('document.pdf') => 'document'
 */
export const removeFileExtension = fileName => {
	const fileArray = fileName.split('.')
	fileArray.pop()
	return fileArray.join('.')
}

/**
 * Retourne le type du fichier et son nom
 * @param {string} file nom du fichier
 * @returns nom et type du fichier
 * @example getFileInfos(fichier.exemple.pdf) => { name: 'fichier.exemple', type: 'pdf'}
 */
export const getFileInfos = file => {
	const fileNameSplited = file.split('.')
	const filetType = fileNameSplited.pop()
	return {
		name: fileNameSplited.join('.'),
		type: filetType,
	}
}

/**
 * Formate le pseudo et l'ID de l'utilisateur sous la forme "Pseudo (ID 123456789123456789)"
 * @param {GuildMember} guildMember
 * @param {User} user
 * @returns le pseudo du guildMember ou le tag de l'user
 */
export const displayNameAndID = (guildMember, user) => {
	if (guildMember && guildMember.displayName)
		return `${guildMember.displayName} (ID ${guildMember.id})`

	if (user && user.username) return `${user.username} (ID ${user.id})`

	return '?'
}

/**
 * Ferme proprement l'application
 * @param {'SIGINT' | 'SIGTERM'} signal received
 * @param {Client} client Discord.js
 */
export const closeGracefully = (signal, client) => {
	console.log(`Received signal to terminate : ${signal}`)

	client.destroy()
	console.log('Discord client successfully destroyed')

	process.exit(0)
}

/**
 * Converti la date dans un format utilisé par Discord pour afficher une date
 * @param {Date} date
 */
export const convertDateForDiscord = date => `<t:${Math.round(new Date(date) / 1000)}>`

/**
 * Crée un pool de connexion à la base de données
 * @param {Client} client Discord.js
 * @param {string} dbName nom de la base de données à utiliser
 */
export const pool = async client => {
	try {
		const createPool = await mysql.createPool({
			host: client.dbHost,
			user: client.dbUser,
			password: client.dbPass,
			database: client.dbName,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0,
		})

		const promisePool = createPool.promise()

		return promisePool
	} catch (error) {
		console.error(error)
		return false
	}
}
