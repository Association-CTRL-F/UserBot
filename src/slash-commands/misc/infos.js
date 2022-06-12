/* eslint-disable default-case */
/* eslint-disable no-case-declarations */
import { convertDateForDiscord, diffDate } from '../../util/util.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import discordjs, { MessageEmbed } from 'discord.js'

// import nodePackage from '../../../package.json'
import { readFileSync } from 'fs'
const { version } = JSON.parse(readFileSync('./package.json'))

export default {
	data: new SlashCommandBuilder()
		.setName('infos')
		.setDescription('Donne quelques infos sur le serveur et le bot')
		.addSubcommand(subcommand => subcommand.setName('bot').setDescription('Infos du bot'))
		.addSubcommand(subcommand =>
			subcommand.setName('server').setDescription('Infos du serveur'),
		),
	interaction: (interaction, client) => {
		switch (interaction.options.getSubcommand()) {
			case 'bot':
				const embedBot = new MessageEmbed()
					.setColor('#3366FF')
					.setAuthor({
						name: `${client.user.username} (ID ${client.user.id})`,
						iconURL: client.user.displayAvatarURL({ dynamic: true }),
					})
					.addFields([
						{
							name: 'Latence API',
							value: `${client.ws.ping} ms`,
						},
						{
							name: 'Uptime',
							value: diffDate(client.readyAt),
						},
						{
							name: 'Préfixe',
							value: `\`${client.config.bot.prefix}\``,
						},
						{
							name: 'Version',
							value: version,
						},
						{
							name: 'Version Discord.js',
							value: discordjs.version,
						},
					])

				return interaction.reply({ embeds: [embedBot] })

			case 'server':
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

				const embedServer = new MessageEmbed()
					.setColor('#3366FF')
					.setAuthor({
						name: `${interaction.guild.name} (ID ${interaction.guild.id})`,
						iconURL: interaction.guild.iconURL({ dynamic: true }),
						url: interaction.guild.vanityURL,
					})
					.addFields([
						{
							name: '**Date de création**',
							value: convertDateForDiscord(interaction.guild.createdAt),
							inline: true,
						},
						{
							name: '**Âge du serveur**',
							value: `${diffDate(interaction.guild.createdAt)}`,
							inline: true,
						},
						{
							name: '**Propriétaire du serveur**',
							value: `<@${interaction.guild.ownerId}>`,
							inline: true,
						},
						{
							name: '**Rôle le plus élevé**',
							value: `${interaction.guild.roles.highest}`,
							inline: true,
						},
						{
							name: '**Nombre de membres**',
							value: `${interaction.guild.memberCount}/${interaction.guild.maximumMembers}`,
							inline: true,
						},
						{
							name: "**Nombre d'émojis**",
							value: `${interaction.guild.emojis.cache.size}`,
							inline: true,
						},
						{
							name: '**Nombre de canaux**',
							value: `${interaction.guild.channels.cache.size}`,
							inline: true,
						},
						{
							name: '**Niveau de vérification**',
							value: `${verificationLevel[interaction.guild.verificationLevel]}`,
							inline: true,
						},
						{
							name: '**A2F**',
							value: `${mfaLevel[interaction.guild.mfaLevel]}`,
							inline: true,
						},
						{
							name: '**Niveau Boost Nitro**',
							value: `${premiumTier[interaction.guild.premiumTier]}`,
							inline: true,
						},
					])

				return interaction.reply({ embeds: [embedServer] })
		}
	},
}
