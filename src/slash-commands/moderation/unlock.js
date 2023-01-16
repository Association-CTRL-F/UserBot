import { SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('unlock').setDescription('Déverrouille le salon'),
	interaction: async interaction => {
		await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
			SendMessages: null,
		})

		return interaction.reply({
			content: 'Salon déverrouillé 👌',
		})
	},
}
