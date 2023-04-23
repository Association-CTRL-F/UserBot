import { EmbedBuilder } from 'discord.js'

export default async (client, bdd, guild) => {
	// Acquisition du rôle Muted
	const mutedRole = client.config.guild.roles.MUTED_ROLE_ID
	if (!mutedRole) return

	// Acquisition des mutes depuis la base de données
	let mutes = []
	try {
		const sql = 'SELECT * FROM mute'
		const [result] = await bdd.execute(sql)
		mutes = result
	} catch (error) {
		return console.error(error)
	}

	// Lecture du message d'unmute
	let unmuteDM = ''
	try {
		const sql = 'SELECT * FROM forms WHERE name = ?'
		const data = ['unmute']
		const [result] = await bdd.execute(sql, data)
		unmuteDM = result[0].content
	} catch (error) {
		return console.error(error)
	}

	if (mutes)
		mutes.forEach(async mutedMember => {
			// Acquisition du membre
			const member = guild.members.cache.get(mutedMember.discordID)
			if (!member) return

			// Si le membre a le rôle Muted
			// et que le temps du mute est expiré
			// alors on retire le rôle Muted
			// et on supprime en base de données
			if (
				member.roles.cache.has(mutedRole) &&
				parseInt(mutedMember.timestampEnd) <= Math.round(Date.now() / 1000)
			) {
				member.roles.remove(mutedRole)

				// Suppression du mute en base de données
				let deletedMute = {}
				try {
					const sql = 'DELETE FROM mute WHERE discordID = ? AND timestampEnd = ?'
					const data = [member.id, mutedMember.timestampEnd]
					const [result] = await bdd.execute(sql, data)
					deletedMute = result
				} catch (error) {
					return console.error(error)
				}

				// Si pas d'erreur, envoi du message privé
				const embed = new EmbedBuilder()
					.setColor('#C27C0E')
					.setTitle('Mute terminé')
					.setDescription(unmuteDM)
					.setAuthor({
						name: guild.name,
						iconURL: guild.iconURL({ dynamic: true }),
						url: guild.vanityURL,
					})

				if (deletedMute.affectedRows === 1)
					return member
						.send({
							embeds: [embed],
						})
						.catch(error => {
							console.error(error)
							return error
						})
			} else {
				// Sinon on réactive le timeout et on supprime
				// le rôle Muted après le temps écoulé
				// puis on envoi le message privé
				const removeRole = async () => {
					member.roles.remove(mutedRole).catch(error => {
						console.error(error)
						return error
					})

					// Suppression du mute en base de données
					let deletedMute = {}
					try {
						const sql = 'DELETE FROM mute WHERE discordID = ? AND timestampEnd = ?'
						const data = [member.id, mutedMember.timestampEnd]
						const [result] = await bdd.execute(sql, data)
						deletedMute = result
					} catch (error) {
						return console.error(error)
					}

					// Si pas d'erreur, envoi du message privé
					const embed = new EmbedBuilder()
						.setColor('#C27C0E')
						.setTitle('Mute terminé')
						.setDescription(unmuteDM)
						.setAuthor({
							name: guild.name,
							iconURL: guild.iconURL({ dynamic: true }),
							url: guild.vanityURL,
						})

					if (deletedMute.affectedRows === 1)
						return member
							.send({
								embeds: [embed],
							})
							.catch(error => {
								console.error(error)
								return error
							})
				}

				// Redéfinition du timeout
				setTimeout(
					removeRole,
					(mutedMember.timestampEnd - Math.round(Date.now() / 1000)) * 1000,
				)
			}
		})
}
