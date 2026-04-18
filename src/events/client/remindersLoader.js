import { EmbedBuilder } from 'discord.js'

const sendReminder = async (member, reminder, guild) => {
	if (reminder.private) {
		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Rappel')
			.setDescription(reminder.reminder)

		return member.send({
			embeds: [embed],
		})
	}

	const channel = guild.channels.cache.get(reminder.channel)
	if (!channel?.isTextBased()) return null

	return channel.send({
		content: `Rappel pour ${member} : ${reminder.reminder}`,
	})
}

export default async (bdd, guild) => {
	if (!guild?.available) return

	// Acquisition des rappels depuis la base de données
	let reminders = []
	try {
		const sql = 'SELECT * FROM reminders'
		const [result] = await bdd.execute(sql)
		reminders = result ?? []
	} catch (error) {
		console.error(error)
		return
	}

	if (!reminders.length) return

	const runReminder = async (reminder) => {
		const member = await guild.members.fetch(reminder.discordID).catch(() => null)
		if (!member) return

		let deletedReminder = null
		try {
			const sql = 'DELETE FROM reminders WHERE discordID = ? AND timestampEnd = ?'
			const data = [member.user.id, reminder.timestampEnd]
			const [result] = await bdd.execute(sql, data)
			deletedReminder = result
		} catch (error) {
			console.error(error)
			return
		}

		if (deletedReminder?.affectedRows === 1) {
			await sendReminder(member, reminder, guild).catch((error) => {
				console.error(error)
				return null
			})
		}
	}

	for (const reminder of reminders) {
		const timestampEnd = Number.parseInt(reminder.timestampEnd, 10)
		if (Number.isNaN(timestampEnd)) continue

		const delayMs = Math.max(0, (timestampEnd - Math.round(Date.now() / 1000)) * 1000)

		if (delayMs === 0) {
			await runReminder(reminder)
			continue
		}

		const timeout = globalThis.setTimeout(() => {
			runReminder(reminder).catch(console.error)
		}, delayMs)

		try {
			const sql = 'UPDATE reminders SET timeoutId = ? WHERE id = ?'
			const data = [Number(timeout), reminder.id]
			await bdd.execute(sql, data)
		} catch (error) {
			console.error(error)
		}
	}
}
