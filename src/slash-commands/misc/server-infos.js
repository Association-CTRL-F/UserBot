import { convertDateForDiscord, diffDate } from '../../util/util.js'
import { SlashCommandBuilder } from '@discordjs/builders'

export default {
	data: new SlashCommandBuilder()
		.setName('server-infos')
		.setDescription('Shows information about the server!')
		.addStringOption(option =>
			option.setName('id').setDescription("The server's ID ").setRequired(false),
		),

	error: false,
	interaction: (interaction, client) => {
		const id = interaction.options.getString('id') || interaction.guild
		const guild = client.guilds.cache.get(id) || interaction.guild

		const premiumTier = {
			NONE: 'Non spécifié',
			TIER_1: 'Niveau 1',
			TIER_2: 'Niveau 2',
			TIER_3: 'Niveau 3',
		}

		const mfaLevel = { NONE: 'Désactivé', ELEVATED: 'Activé' }

		const verificationLevel = {
			NONE: 'Non spécifié',
			LOW: 'Faible : email vérifié requis.',
			MEDIUM: 'Moyen : sur Discord depuis 5 minutes.',
			HIGH: 'Élevé : sur le serveur depuis 10 minutes.',
			VERY_HIGH: 'Très élevé : numéro de téléphone vérifié.',
		}

		const embed = {
			color: '#3366FF',
			author: {
				name: `${guild.name} (ID ${guild.id})`,
				icon_url: guild.iconURL({ dynamic: true }),
				url: guild.vanityURL,
			},
			fields: [
				{
					name: '**Date de création**',
					value: convertDateForDiscord(guild.createdAt),
					inline: true,
				},
				{
					name: '**Âge du serveur**',
					value: `${diffDate(guild.createdAt)}`,
					inline: true,
				},
				{
					name: '**Propriétaire du serveur**',
					value: `<@!${guild.ownerId}>`,
					inline: true,
				},
				{
					name: '**Rôle le plus élevé**',
					value: `${guild.roles.highest}`,
					inline: true,
				},
				{
					name: '**Nombre de membres**',
					value: `${guild.memberCount}/${guild.maximumMembers}`,
					inline: true,
				},
				{
					name: "**Nombre d'émojis**",
					value: `${guild.emojis.cache.size}`,
					inline: true,
				},
				{
					name: '**Nombre de canaux**',
					value: `${guild.channels.cache.size}`,
					inline: true,
				},
				{
					name: '**Niveau de vérification**',
					value: `${verificationLevel[guild.verificationLevel]}`,
					inline: true,
				},
				{
					name: '**A2F**',
					value: `${mfaLevel[guild.mfaLevel]}`,
					inline: true,
				},
				{
					name: '**Niveau Boost Nitro**',
					value: `${premiumTier[guild.premiumTier]}`,
					inline: true,
				},
			],
		}

		return interaction.reply({ embeds: [embed] })
	},
}
