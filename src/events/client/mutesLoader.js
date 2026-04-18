import { EmbedBuilder } from 'discord.js'

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

const removeMute = async ({ member, mutedRole, mutedMember, bdd, guild, unmuteDM }) => {
	try {
		// Si le membre a encore le rôle, on le retire
		if (member.roles.cache.has(mutedRole)) {
			await member.roles.remove(mutedRole)
		}
	} catch (error) {
		console.error(error)
		return
	}

	let deletedMute = null
	try {
		const sql = 'DELETE FROM mute WHERE discordID = ? AND timestampEnd = ?'
		const data = [member.id, mutedMember.timestampEnd]
		const [result] = await bdd.execute(sql, data)
		deletedMute = result
	} catch (error) {
		console.error(error)
		return
	}

	if (deletedMute?.affectedRows === 1) {
		const embed = buildUnmuteEmbed(guild, unmuteDM)

		await member.send({ embeds: [embed] }).catch((error) => {
			console.error(error)
			return null
		})
	}
}

export default async (client, bdd, guild) => {
	// Acquisition du rôle Muted
	const mutedRole = client.config.guild.roles.MUTED_ROLE_ID
	if (!mutedRole) return

	// Acquisition des mutes depuis la base de données
	let mutes = []
	try {
		const sql = 'SELECT * FROM mute'
		const [result] = await bdd.execute(sql)
		mutes = result ?? []
	} catch (error) {
		console.error(error)
		return
	}

	// Lecture du message d'unmute
	let unmuteDM = ''
	try {
		const sql = 'SELECT * FROM forms WHERE name = ?'
		const data = ['unmute']
		const [result] = await bdd.execute(sql, data)
		unmuteDM = result?.[0]?.content ?? ''
	} catch (error) {
		console.error(error)
		return
	}

	if (!mutes.length) return

	for (const mutedMember of mutes) {
		// Acquisition du membre : fetch plus fiable qu'un simple cache au démarrage
		const member = await guild.members.fetch(mutedMember.discordID).catch(() => null)
		if (!member) continue

		const timestampEnd = Number.parseInt(mutedMember.timestampEnd, 10)
		if (Number.isNaN(timestampEnd)) continue

		const now = Math.round(Date.now() / 1000)

		// Si le membre a le rôle Muted et que le mute est expiré, on retire tout de suite
		if (member.roles.cache.has(mutedRole) && timestampEnd <= now) {
			await removeMute({
				member,
				mutedRole,
				mutedMember,
				bdd,
				guild,
				unmuteDM,
			})
			continue
		}

		// Si le rôle n'est déjà plus là, on nettoie juste la base
		if (!member.roles.cache.has(mutedRole)) {
			try {
				const sql = 'DELETE FROM mute WHERE discordID = ? AND timestampEnd = ?'
				const data = [member.id, mutedMember.timestampEnd]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}
			continue
		}

		// Sinon on redéfinit le timeout
		const delayMs = Math.max(0, (timestampEnd - now) * 1000)

		globalThis.setTimeout(() => {
			removeMute({
				member,
				mutedRole,
				mutedMember,
				bdd,
				guild,
				unmuteDM,
			}).catch(console.error)
		}, delayMs)
	}
}
