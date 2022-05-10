import { diffDate } from '../../util/util.js'
import { SlashCommandBuilder } from '@discordjs/builders'

// import nodePackage from '../../../package.json'
import { readFileSync } from 'fs'
const { version } = JSON.parse(readFileSync('./package.json'))

export default {
	data: new SlashCommandBuilder()
		.setName('infos')
		.setDescription('Donne quelques infos et le statut du bot'),
	interaction: async (interaction, client) => {
		const embed = {
			color: '01579B',
			title: 'Infos',
			fields: [
				{
					name: 'Latence API',
					value: `${client.ws.ping} ms`,
					inline: true,
				},
				{
					name: 'Uptime',
					value: diffDate(client.readyAt),
					inline: true,
				},
				{
					name: 'Préfixe',
					value: `\`${client.config.bot.prefix}\``,
					inline: true,
				},
				{
					name: 'Version',
					value: version,
					inline: true,
				},
			],
		}

		await interaction.reply({ embeds: [embed] })
	},
}
