import { EmbedBuilder } from 'discord.js'

export default async (bdd, guild) => {
	// Acquisition des rappels depuis la base de données
	let reminders = []
	try {
		const sql = 'SELECT * FROM reminders'
		const [result] = await bdd.execute(sql)
		reminders = result
	} catch (error) {
		return console.error(error)
	}

	if (reminders)
		reminders.forEach(async reminder => {
			// Acquisition du membre
			const member = await guild.members.fetch(reminder.discordID)
			if (!member) return

			if (parseInt(reminder.timestampEnd) <= Math.round(Date.now() / 1000)) {
				// Si le rappel est expiré
				// alors on supprime en base de données
				// et on envoi le message privé
				// Suppression du rappel en base de données
				let deletedReminder = {}
				try {
					const sql = 'DELETE FROM reminders WHERE discordID = ? AND timestampEnd = ?'
					const data = [member.user.id, reminder.timestampEnd]
					const [result] = await bdd.execute(sql, data)
					deletedReminder = result
				} catch (error) {
					return console.error(error)
				}

				// Envoi du rappel en message privé
				if (deletedReminder.affectedRows === 1) {
					if (reminder.private) {
						const embed = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Rappel')
							.setDescription(reminder.reminder)

						return member
							.send({
								embeds: [embed],
							})
							.catch(error => {
								console.error(error)
								return error
							})
					}

					const channel = member.guild.channels.cache.get(reminder.channel)

					return channel
						.send({
							content: `Rappel pour ${member} : ${reminder.reminder}`,
						})
						.catch(error => {
							console.error(error)
							return error
						})
				}
			}

			// Sinon on réactive le timeout
			// et on supprime en base de données
			// puis on envoi le message privé
			const timeout = setTimeout(async () => {
				let deletedReminder = {}
				try {
					// Suppression du rappel en base de données
					const sql = 'DELETE FROM reminders WHERE discordID = ? AND timestampEnd = ?'
					const data = [member.user.id, reminder.timestampEnd]
					const [result] = await bdd.execute(sql, data)
					deletedReminder = result
				} catch (error) {
					return console.error(error)
				}

				// Envoi du rappel en message privé
				if (deletedReminder.affectedRows === 1) {
					if (reminder.private) {
						const embed = new EmbedBuilder()
							.setColor('#C27C0E')
							.setTitle('Rappel')
							.setDescription(reminder.reminder)

						return member
							.send({
								embeds: [embed],
							})
							.catch(error => {
								console.error(error)
								return error
							})
					}

					const channel = member.guild.channels.cache.get(reminder.channel)

					return channel
						.send({
							content: `Rappel pour ${member} : ${reminder.reminder}`,
						})
						.catch(error => {
							console.error(error)
							return error
						})
				}
			}, (reminder.timestampEnd - Math.round(Date.now() / 1000)) * 1000)

			try {
				const sql = 'UPDATE reminders SET timeoutId = ? WHERE id = ?'
				const data = [Number(timeout), reminder.id]
				await bdd.execute(sql, data)
			} catch (error) {
				console.error(error)
			}
		})
}
