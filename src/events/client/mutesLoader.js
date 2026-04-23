import { EmbedBuilder } from 'discord.js'

const ensureMuteTimeoutCache = (client) => {
	if (!client.cache) {
		client.cache = {}
	}

	if (!(client.cache.muteTimeouts instanceof Map)) {
		client.cache.muteTimeouts = new Map()
	}

	return client.cache.muteTimeouts
}

const clearScheduledMute = (client, memberId) => {
	const muteTimeouts = ensureMuteTimeoutCache(client)
	const existingTimeout = muteTimeouts.get(memberId)

	if (existingTimeout) {
		globalThis.clearTimeout(existingTimeout)
		muteTimeouts.delete(memberId)
	}
}

const buildUnmuteEmbed = (guild, unmuteDM) =>
	new EmbedBuilder()
		.setColor('#C27C0E')
		.setTitle('Mute terminé')
		.setDescription(unmuteDM)
		.setAuthor({
			name: guild.name,
			iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
			url: guild.vanityURL ?? undefined,
		})

const deleteMuteRecord = async (bdd, discordId, timestampEnd) => {
	const sql = 'DELETE FROM mute WHERE discordID = ? AND timestampEnd = ?'
	const data = [discordId, timestampEnd]
	const [result] = await bdd.execute(sql, data)

	return result
}

export const getUnmuteMessage = async (bdd) => {
	try {
		const sql = 'SELECT * FROM forms WHERE name = ?'
		const data = ['unmute']
		const [result] = await bdd.execute(sql, data)

		return result?.[0]?.content ?? ''
	} catch (error) {
		console.error(error)
		return ''
	}
}

export const removeMute = async ({
	client,
	member,
	mutedRoleId,
	mutedMember,
	bdd,
	guild,
	unmuteDM,
}) => {
	clearScheduledMute(client, member.id)

	try {
		if (member.roles.cache.has(mutedRoleId)) {
			await member.roles.remove(mutedRoleId)
		}
	} catch (error) {
		console.error(error)
		return false
	}

	let deletedMute = null
	try {
		deletedMute = await deleteMuteRecord(bdd, member.id, mutedMember.timestampEnd)
	} catch (error) {
		console.error(error)
		return false
	}

	if (deletedMute?.affectedRows === 1 && unmuteDM) {
		const embed = buildUnmuteEmbed(guild, unmuteDM)

		await member.send({ embeds: [embed] }).catch((error) => {
			console.error(error)
			return null
		})
	}

	return true
}

const scheduleMuteRemoval = ({
	client,
	member,
	mutedRoleId,
	mutedMember,
	bdd,
	guild,
	unmuteDM,
	delayMs,
}) => {
	clearScheduledMute(client, member.id)

	const muteTimeouts = ensureMuteTimeoutCache(client)

	const timeout = globalThis.setTimeout(() => {
		removeMute({
			client,
			member,
			mutedRoleId,
			mutedMember,
			bdd,
			guild,
			unmuteDM,
		}).catch(console.error)
	}, delayMs)

	muteTimeouts.set(member.id, timeout)
}

export const restoreMuteForMember = async ({
	client,
	bdd,
	guild,
	member,
	mutedMember,
	unmuteDM,
}) => {
	const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID
	if (!mutedRoleId || !member || !mutedMember) return false

	const timestampEnd = Number.parseInt(mutedMember.timestampEnd, 10)
	if (Number.isNaN(timestampEnd)) {
		try {
			await deleteMuteRecord(bdd, member.id, mutedMember.timestampEnd)
		} catch (error) {
			console.error(error)
		}
		return false
	}

	const now = Math.round(Date.now() / 1000)

	if (timestampEnd <= now) {
		await removeMute({
			client,
			member,
			mutedRoleId,
			mutedMember,
			bdd,
			guild,
			unmuteDM,
		})

		return false
	}

	if (!member.roles.cache.has(mutedRoleId)) {
		try {
			await member.roles.add(
				mutedRoleId,
				'Restauration automatique du mute après reconnexion',
			)
		} catch (error) {
			console.error(error)
			return false
		}
	}

	const delayMs = Math.max(0, (timestampEnd - now) * 1000)

	scheduleMuteRemoval({
		client,
		member,
		mutedRoleId,
		mutedMember,
		bdd,
		guild,
		unmuteDM,
		delayMs,
	})

	return true
}

export default async (client, bdd, guild) => {
	const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID
	if (!mutedRoleId) return

	let mutes = []
	try {
		const sql = 'SELECT * FROM mute'
		const [result] = await bdd.execute(sql)
		mutes = result ?? []
	} catch (error) {
		console.error(error)
		return
	}

	if (!mutes.length) return

	const unmuteDM = await getUnmuteMessage(bdd)
	const now = Math.round(Date.now() / 1000)

	for (const mutedMember of mutes) {
		const timestampEnd = Number.parseInt(mutedMember.timestampEnd, 10)

		if (Number.isNaN(timestampEnd)) {
			try {
				await deleteMuteRecord(bdd, mutedMember.discordID, mutedMember.timestampEnd)
			} catch (error) {
				console.error(error)
			}
			continue
		}

		const member = await guild.members.fetch(mutedMember.discordID).catch(() => null)

		// Si le mute est expiré et le membre absent, on nettoie juste la base
		if (timestampEnd <= now && !member) {
			try {
				await deleteMuteRecord(bdd, mutedMember.discordID, mutedMember.timestampEnd)
			} catch (error) {
				console.error(error)
			}
			continue
		}

		// Si le membre n'est pas là mais le mute est encore actif, on garde la ligne en base
		// pour la restaurer à son retour.
		if (!member) {
			continue
		}

		await restoreMuteForMember({
			client,
			bdd,
			guild,
			member,
			mutedMember,
			unmuteDM,
		})
	}
}
