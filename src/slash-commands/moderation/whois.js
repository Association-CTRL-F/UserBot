import { convertDateForDiscord, diffDate, isGuildSetup } from '../../util/util.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('whois')
		.setDescription('Donne des infos sur soit ou un autre utilisateur')
		.addUserOption(option => option.setName('membre').setDescription('Membre')),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// Acquisition du membre
		const user = interaction.options.getUser('membre') || interaction.user
		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.reply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				ephemeral: true,
			})

		// Création de l'embed
		const embed = new MessageEmbed()
			.setColor(member.displayColor)
			.setAuthor({
				name: `${member.displayName} (ID : ${member.id})`,
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
			])

		// Ajout d'un field si l'utilisateur boost le serveur
		if (member.premiumSince)
			embed.fields.push({
				name: 'Boost Nitro depuis',
				value: diffDate(member.premiumSince),
				inline: true,
			})

		return interaction.reply({ embeds: [embed] })
	},
}
