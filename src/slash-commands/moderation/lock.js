import { SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('lock').setDescription('Verrouille le salon'),
	interaction: async interaction => {
		await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
			SendMessages: false,
		})

		return interaction.reply({
			content: 'Salon verrouillé 👌',
		})
	},
}
