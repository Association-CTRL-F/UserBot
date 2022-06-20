export default async (guild, client) => {
	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd)
		return console.log('Une erreur est survenue lors de la connexion à la base de données')

	try {
		const sql = `INSERT INTO config (
				isSetup,
                COMMANDS_PREFIX,
                GUILD_ID,
                LEAVE_JOIN_CHANNEL_ID,
                REPORT_CHANNEL_ID,
                LOGS_MESSAGES_CHANNEL_ID,
                LOGS_BANS_CHANNEL_ID,
                JOIN_ROLE_ID,
                TIMEOUT_JOIN,
                MUTED_ROLE_ID,
                TRIBUNAL_CHANNEL_ID,
                CONFIG_CHANNEL_ID,
                UPGRADE_CHANNEL_ID,
                BLABLA_CHANNEL_ID,
                VOICE_MANAGER_CHANNELS_IDs,
                NOLOGS_MANAGER_CHANNELS_IDS,
                NOTEXT_MANAGER_CHANNELS_IDS,
                THREADS_MANAGER_CHANNELS_IDS,
                STAFF_ROLES_MANAGER_IDS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		const data = [
			0,
			'!',
			guild.id,
			null,
			null,
			null,
			null,
			null,
			'30m',
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		]

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'config', `\`\`\`Le formulaire de config\`\`\``]

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'configDescription', 'La description du formulaire de config']

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'upgrade', `\`\`\`Le formulaire d'upgrade\`\`\``]

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'upgradeDescription', "La description du formulaire d'upgrade"]

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'mute', 'Le message de mute']

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'unmute', "Le message d'unmute"]

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'warn', "Le message d'avertissement"]

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}

	try {
		const sql = 'INSERT INTO forms (guildId, name, content) VALUES (?, ?, ?)'
		const data = [guild.id, 'ban', 'Le message de bannissement']

		await bdd.execute(sql, data)
	} catch (error) {
		return console.log(error)
	}
}
