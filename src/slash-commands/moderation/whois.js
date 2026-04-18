import { convertDateForDiscord, diffDate, displayNameAndID } from '../../util/util.js'
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('whois')
		.setDescription('Donne des infos sur soi ou un autre utilisateur')
		.addUserOption((option) => option.setName('membre').setDescription('Membre')),

	interaction: async (interaction, client) => {
		// Acquisition du membre
		const user = interaction.options.getUser('membre') || interaction.user
		const member = await interaction.guild.members.fetch(user.id).catch(() => null)

		if (!member) {
			return interaction.reply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				flags: MessageFlags.Ephemeral,
			})
		}

		// Acquisition de la base de données
		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration) {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
				flags: MessageFlags.Ephemeral,
			})
		}

		// Nombre de warns
		let warnings = []
		try {
			const sql = 'SELECT * FROM warnings_logs WHERE discord_id = ?'
			const data = [user.id]
			const [result] = await bddModeration.execute(sql, data)
			warnings = result ?? []
		} catch (error) {
			console.error(error)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la récupération des avertissements 😬',
				flags: MessageFlags.Ephemeral,
			})
		}

		// Historique ban
		let ban = []
		try {
			const sql = 'SELECT * FROM demandes_logs WHERE discord_id = ?'
			const data = [user.id]
			const [result] = await bddModeration.execute(sql, data)
			ban = result ?? []
		} catch (error) {
			console.error(error)
			return interaction.reply({
				content:
					"Une erreur est survenue lors de la récupération de l'historique de bannissement 😬",
				flags: MessageFlags.Ephemeral,
			})
		}

		// Création de l'embed
		const embed = new EmbedBuilder()
			.setColor(member.displayColor || 0x2f3136)
			.setAuthor({
				name: displayNameAndID(member, member.user),
				iconURL: member.user.displayAvatarURL({ dynamic: true }),
			})
			.addFields(
				{
					name: "Compte de l'utilisateur",
					value: member.user.tag,
					inline: true,
				},
				{
					name: 'Compte créé le',
					value: convertDateForDiscord(member.user.createdAt),
					inline: true,
				},
				{
					name: 'Âge du compte',
					value: diffDate(member.user.createdAt),
					inline: true,
				},
				{
					name: 'Mention',
					value: member.toString(),
					inline: true,
				},
				{
					name: 'Serveur rejoint le',
					value: member.joinedAt ? convertDateForDiscord(member.joinedAt) : 'Inconnu',
					inline: true,
				},
				{
					name: 'Est sur le serveur depuis',
					value: member.joinedAt ? diffDate(member.joinedAt) : 'Inconnu',
					inline: true,
				},
				{
					name: 'Historique',
					value: `Nombre d'avertissement(s) : ${warnings.length}\nA déjà été banni : ${ban.length} fois`,
					inline: false,
				},
			)

		// Ajout d'un champ si l'utilisateur boost le serveur
		if (member.premiumSince) {
			embed.addFields({
				name: 'Boost Nitro depuis',
				value: diffDate(member.premiumSince),
				inline: true,
			})
		}

		return interaction.reply({ embeds: [embed] })
	},
}
