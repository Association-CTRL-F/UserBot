import { SlashCommandBuilder, EmbedBuilder, RESTJSONErrorCodes, MessageFlags } from 'discord.js'

const isValidDiscordId = (value) => /^\d{17,19}$/.test(value)

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

export default {
	data: new SlashCommandBuilder()
		.setName('unmute')
		.setDescription("Lève le mute d'un ou plusieurs membres")
		.addSubcommand((subcommand) =>
			subcommand
				.setName('member')
				.setDescription("Lève le mute d'un membre")
				.addUserOption((option) =>
					option.setName('membre').setDescription('Membre').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('members')
				.setDescription('Lève le mute de plusieurs membres')
				.addStringOption((option) =>
					option.setName('membres').setDescription('Membres').setRequired(true),
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

		await interaction.deferReply()

		const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID
		if (!mutedRoleId) {
			return interaction.editReply({
				content: "Il n'y a pas de rôle Muted 😕",
			})
		}

		let unmuteDM = ''
		try {
			const sql = 'SELECT * FROM forms WHERE name = ?'
			const data = ['unmute']
			const [result] = await bdd.execute(sql, data)
			unmuteDM = result?.[0]?.content ?? ''
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la récupération du message d'unmute en base de données 😬",
			})
		}

		const sendUnmuteDm = async (member) => {
			const embed = buildUnmuteEmbed(interaction.guild, unmuteDM)

			try {
				await member.send({
					embeds: [embed],
				})
			} catch (error) {
				if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
					console.error(error)
				}
			}
		}

		const unmuteOneMember = async (member) => {
			if (!member.roles.cache.has(mutedRoleId)) {
				return {
					status: 'not_muted',
				}
			}

			if (member.id === interaction.user.id) {
				return {
					status: 'self',
				}
			}

			let mutedMember = null
			try {
				const sql = 'SELECT * FROM mute WHERE discordID = ?'
				const data = [member.id]
				const [result] = await bdd.execute(sql, data)
				mutedMember = result?.[0] ?? null
			} catch (error) {
				console.error(error)
				return {
					status: 'db_error',
				}
			}

			try {
				if (mutedMember) {
					const sql = 'DELETE FROM mute WHERE discordID = ?'
					const data = [member.id]
					await bdd.execute(sql, data)
				}
			} catch (error) {
				console.error(error)
				return {
					status: 'db_error',
				}
			}

			try {
				await member.roles.remove(mutedRoleId)
			} catch (error) {
				if (mutedMember) {
					try {
						const sql =
							'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
						const data = [
							mutedMember.discordID,
							mutedMember.timestampStart,
							mutedMember.timestampEnd,
						]
						await bdd.execute(sql, data)
					} catch (rollbackError) {
						console.error(rollbackError)
					}
				}

				if (error.code === RESTJSONErrorCodes.MissingPermissions) {
					return {
						status: 'missing_permissions',
					}
				}

				console.error(error)
				return {
					status: 'role_error',
				}
			}

			await sendUnmuteDm(member)

			return {
				status: mutedMember ? 'ok' : 'role_only',
				member,
			}
		}

		switch (interaction.options.getSubcommand()) {
			case 'member': {
				const user = interaction.options.getUser('membre')
				const member = await interaction.guild.members.fetch(user.id).catch(() => null)

				if (!member) {
					return interaction.editReply({
						content:
							"Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
					})
				}

				const result = await unmuteOneMember(member)

				if (result.status === 'not_muted') {
					return interaction.editReply({
						content: "Le membre n'est pas muté 😕",
					})
				}

				if (result.status === 'self') {
					return interaction.editReply({
						content: 'Tu ne peux pas te démute toi-même 😕',
					})
				}

				if (result.status === 'db_error') {
					return interaction.editReply({
						content:
							"Une erreur est survenue lors de l'unmute du membre en base de données 😬",
					})
				}

				if (result.status === 'missing_permissions') {
					return interaction.editReply({
						content: "Je n'ai pas les permissions pour unmute ce membre 😬",
					})
				}

				if (result.status === 'role_error') {
					return interaction.editReply({
						content: 'Une erreur est survenue lors de la levée du mute du membre 😬',
					})
				}

				if (result.status === 'role_only') {
					return interaction.editReply({
						content: `\`${member.user.tag}\` n'était pas muté en base de données, mais le rôle a été retiré 😬`,
					})
				}

				return interaction.editReply({
					content: `🔊 \`${member.user.tag}\` est démuté`,
				})
			}

			case 'members': {
				const rawUsers = interaction.options.getString('membres')
				const userIds = [
					...new Set(
						rawUsers
							.split(/[\s,]+/)
							.map((id) => id.trim())
							.filter(Boolean),
					),
				]

				if (userIds.length < 2) {
					return interaction.editReply({
						content: "Tu n'as pas unmute plusieurs membres 😕",
					})
				}

				const invalidIds = userIds.filter((id) => !isValidDiscordId(id))
				if (invalidIds.length) {
					return interaction.editReply({
						content: `ID invalide(s) : \`${invalidIds.join('`, `')}\` 😕`,
					})
				}

				const members = await Promise.all(
					userIds.map((id) => interaction.guild.members.fetch(id).catch(() => null)),
				)

				if (members.some((member) => !member)) {
					return interaction.editReply({
						content:
							'Un ou plusieurs utilisateurs sont introuvables, vérifie les IDs 😕',
					})
				}

				if (members.some((member) => member.id === interaction.user.id)) {
					return interaction.editReply({
						content: "Tu ne peux pas t'unmute toi-même 😕",
					})
				}

				const results = []
				for (const member of members) {
					results.push(await unmuteOneMember(member))
				}

				if (results.some((result) => result.status === 'db_error')) {
					return interaction.editReply({
						content:
							"Une erreur est survenue lors de l'unmute d'un membre en base de données 😬",
					})
				}

				if (results.some((result) => result.status === 'missing_permissions')) {
					return interaction.editReply({
						content:
							"Je n'ai pas les permissions pour unmute un ou plusieurs membres 😬",
					})
				}

				if (results.some((result) => result.status === 'role_error')) {
					return interaction.editReply({
						content: 'Une erreur est survenue lors de la levée du mute du membre 😬',
					})
				}

				const unmuttedMembers = results
					.filter((result) => result.status === 'ok' || result.status === 'role_only')
					.map((result) => result.member.user.tag)

				if (!unmuttedMembers.length) {
					return interaction.editReply({
						content: 'Aucun des membres fournis n’était muté 😕',
					})
				}

				const formatted = unmuttedMembers.map((tag) => `\`${tag}\``).join(', ')

				return interaction.editReply({
					content: `🔊 ${formatted} ${
						unmuttedMembers.length > 1 ? 'sont démutés' : 'est démuté'
					}`,
				})
			}
		}
	},
}
