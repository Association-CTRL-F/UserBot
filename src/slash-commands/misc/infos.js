/* eslint-disable default-case */
/* eslint-disable no-case-declarations */
import { convertDateForDiscord, diffDate, displayNameAndID } from '../../util/util.js'
import discordjs, { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import { ChatGPTAPI } from 'chatgpt'

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
		const chatgpt = new ChatGPTAPI({
			apiKey: client.config.others.openAiKey,
		})

		switch (interaction.options.getSubcommand()) {
			case 'bot':
				const embedBot = new EmbedBuilder()
					.setColor('#3366FF')
					.setAuthor({
						name: displayNameAndID(client.user, client.user),
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
							value: `\`${client.config.guild.COMMANDS_PREFIX}\``,
						},
						{
							name: 'Version',
							value: version,
						},
						{
							name: 'Version Discord.js',
							value: discordjs.version,
						},
						{
							name: 'Modèle OpenAI ChatGPT',
							// eslint-disable-next-line no-underscore-dangle
							value: chatgpt._completionParams.model,
						},
					])

				return interaction.reply({ embeds: [embedBot] })

			case 'server':
				const premiumTier = {
					0: 'Aucun Boost',
					1: 'Niveau 1',
					2: 'Niveau 2',
					3: 'Niveau 3',
				}

				const mfaLevel = { 0: 'Désactivé', 1: 'Activé' }

				const verificationLevel = {
					0: 'Non spécifié',
					1: 'Faible : email vérifié requis',
					2: 'Moyen : sur Discord depuis 5 minutes',
					3: 'Élevé : sur le serveur depuis 10 minutes',
					4: 'Très élevé : numéro de téléphone vérifié',
				}

				const embedServer = new EmbedBuilder()
					.setColor('#3366FF')
					.setAuthor({
						name: `${interaction.guild.name} (ID : ${interaction.guild.id})`,
						iconURL: interaction.guild.iconURL({ dynamic: true }),
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
							name: '**Nombre de salons**',
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
