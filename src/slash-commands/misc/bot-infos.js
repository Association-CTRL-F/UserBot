import { diffDate } from '../../util/util.js'
import { SlashCommandBuilder } from '@discordjs/builders'

// import nodePackage from '../../../package.json'
import { readFileSync } from 'fs'
const { version } = JSON.parse(readFileSync('./package.json'))

export default {
	data: new SlashCommandBuilder()
		.setName('bot-infos')
		.setDescription('Donne quelques infos et le statut du bot'),
	interaction: async (interaction, client) => {
		const embed = {
			color: '#3366FF',
			author: {
				name: `${client.user.username} (ID ${client.user.id})`,
				icon_url: client.user.displayAvatarURL({ dynamic: true }),
			},
			fields: [
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
			],
		}

		await interaction.reply({ embeds: [embed] })
	},
}
