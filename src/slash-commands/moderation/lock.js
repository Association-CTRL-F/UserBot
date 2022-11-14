import { isGuildSetup } from '../../util/util.js'
import { SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('lock').setDescription('Verrouille le salon'),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
			SendMessages: false,
		})

		return interaction.reply({
			content: 'Salon verrouillé 👌',
		})
	},
}
