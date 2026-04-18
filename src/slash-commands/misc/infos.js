import { convertDateForDiscord, diffDate } from '../../util/util.js'
import { SlashCommandBuilder, EmbedBuilder, version as discordVersion, MessageFlags } from 'discord.js'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'))

export default {
	data: new SlashCommandBuilder()
		.setName('infos')
		.setDescription('Donne quelques infos sur le serveur et le bot')
		.addSubcommand((subcommand) => subcommand.setName('bot').setDescription('Infos du bot'))
		.addSubcommand((subcommand) =>
			subcommand.setName('server').setDescription('Infos du serveur'),
		),

	interaction: async (interaction) => {
		switch (interaction.options.getSubcommand()) {
			case 'bot':
				const embedBot = new EmbedBuilder()
					.setColor(0x3366ff)
					.setAuthor({
						name: `${interaction.client.user.username} (ID : ${interaction.client.user.id})`,
						iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }),
					})
					.addFields(
						{
							name: 'Latence API',
							value: `${interaction.client.ws.ping} ms`,
						},
						{
							name: 'Uptime',
							value: diffDate(interaction.client.readyAt),
						},
						{
							name: 'Préfixe',
							value: `\`${interaction.client.config.guild.COMMANDS_PREFIX}\``,
						},
						{
							name: 'Version',
							value: version,
						},
						{
							name: 'Version Discord.js',
							value: discordVersion,
						},
					)

				return interaction.reply({ embeds: [embedBot] })

			case 'server':
				if (!interaction.guild) {
					return interaction.reply({
						content: 'Cette commande doit être utilisée dans un serveur 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				const premiumTier = {
					0: 'Aucun Boost',
					1: 'Niveau 1',
					2: 'Niveau 2',
					3: 'Niveau 3',
				}

				const mfaLevel = {
					0: 'Désactivé',
					1: 'Activé',
				}

				const verificationLevel = {
					0: 'Non spécifié',
					1: 'Faible : email vérifié requis',
					2: 'Moyen : sur Discord depuis 5 minutes',
					3: 'Élevé : sur le serveur depuis 10 minutes',
					4: 'Très élevé : numéro de téléphone vérifié',
				}

				const embedServer = new EmbedBuilder()
					.setColor(0x3366ff)
					.setAuthor({
						name: `${interaction.guild.name} (ID : ${interaction.guild.id})`,
						iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
					})
					.addFields(
						{
							name: 'Date de création',
							value: convertDateForDiscord(interaction.guild.createdAt),
							inline: true,
						},
						{
							name: 'Âge du serveur',
							value: diffDate(interaction.guild.createdAt),
							inline: true,
						},
						{
							name: 'Rôle le plus élevé',
							value: `${interaction.guild.roles.highest}`,
							inline: true,
						},
						{
							name: 'Nombre de membres',
							value: `${interaction.guild.memberCount}${
								interaction.guild.maximumMembers
									? `/${interaction.guild.maximumMembers}`
									: ''
							}`,
							inline: true,
						},
						{
							name: "Nombre d'émojis",
							value: `${interaction.guild.emojis.cache.size}`,
							inline: true,
						},
						{
							name: 'Nombre de salons',
							value: `${interaction.guild.channels.cache.size}`,
							inline: true,
						},
						{
							name: 'Niveau de vérification',
							value:
								verificationLevel[interaction.guild.verificationLevel] ?? 'Inconnu',
							inline: true,
						},
						{
							name: 'A2F',
							value: mfaLevel[interaction.guild.mfaLevel] ?? 'Inconnu',
							inline: true,
						},
						{
							name: 'Niveau Boost Nitro',
							value: premiumTier[interaction.guild.premiumTier] ?? 'Inconnu',
							inline: true,
						},
					)

				return interaction.reply({ embeds: [embedServer] })
		}
	},
}
