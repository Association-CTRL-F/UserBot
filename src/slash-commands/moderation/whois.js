import { convertDateForDiscord, diffDate, displayNameAndID } from '../../util/util.js'
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('whois')
		.setDescription('Donne des infos sur soit ou un autre utilisateur')
		.addUserOption(option => option.setName('membre').setDescription('Membre')),
	interaction: async interaction => {
		// Acquisition du membre
		const user = interaction.options.getUser('membre') || interaction.user
		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.reply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				ephemeral: true,
			})

		// Nombre de warns
		let warnings = []
		try {
			const sqlView = 'SELECT * FROM warnings_logs WHERE discord_id = ?'
			const dataView = [user]
			const [resultWarnings] = await bddModeration.execute(sqlView, dataView)
			warnings = resultWarnings
		} catch {
			return interaction.reply({
				content:
					'Une erreur est survenue lors de la récupération des avertissements 😬',
				ephemeral: true,
			})
		}

		// Historique ban
		let ban = []
		try {
			const sqlView = 'SELECT * FROM demandes_logs WHERE discord_id = ?'
			const dataView = [user]
			const [resultBan] = await bddModeration.execute(sqlView, dataView)
			ban = resultBan
		} catch {
			return interaction.reply({
				content:
					"Une erreur est survenue lors de la récupération de l'historique de bannissement 😬",
				ephemeral: true,
			})
		}

		// Création de l'embed
		const embed = new EmbedBuilder()
			.setColor(member.displayColor)
			.setAuthor({
				name: displayNameAndID(member),
				iconURL: member.user.displayAvatarURL({ dynamic: true }),
			})
			.addFields([
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
					value: convertDateForDiscord(member.joinedAt),
					inline: true,
				},
				{
					name: 'Est sur le serveur depuis',
					value: diffDate(member.joinedAt),
					inline: true,
				},
				{
					name: "Historique",
					value: `Nombre d'avertissement(s) : ${warnings.length}\nA déjà été banni : ${ban.length} fois`,
					inline: false,
				},
			])

		// Ajout d'un champ si l'utilisateur boost le serveur
		if (member.premiumSince)
			embed.data.fields.push({
				name: 'Boost Nitro depuis',
				value: diffDate(member.premiumSince),
				inline: true,
			})

		return interaction.reply({ embeds: [embed] })
	},
}
