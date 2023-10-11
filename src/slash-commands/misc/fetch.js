import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('fetch').setDescription('Fetch'),
	interaction: async interaction => {
		// Création de l'embed start
		const logEmbedStart = new EmbedBuilder()
			.setColor('57C92A')
			.setDescription(
				`**START** FETCH ALL GUILD MEMBERS : **${interaction.guild.memberCount} MEMBERS**\n\nACTION : pas de rôle et pending = false`,
			)
			.setTimestamp(new Date())

		await interaction.channel.send({
			embeds: [logEmbedStart],
		})

		// Fetch
		let userCount = 0
		await interaction.guild.members.fetch().then(members =>
			members.forEach(async member => {
				if (
					!member.user.bot &&
					!member.roles.cache.has('475406297127452673') &&
					!member.roles.cache.has('768209418319822868') &&
					member.pending === false
				) {
					userCount += 1
					await interaction.channel.send({
						content: `${member.user.username} (ID : ${member.user.id} ; Mention : <@${member.user.id}>)`,
					})
				}
			}),
		)

		// Création de l'embed end
		const logEmbedEnd = new EmbedBuilder()
			.setColor('57C92A')
			.setDescription(
				`**END** FETCH ALL GUILD MEMBERS : **${interaction.guild.memberCount}**\n\nACTION : pas de rôle et pending = false\n\nMEMBERS TRIGGERED : **${userCount}**`,
			)
			.setTimestamp(new Date())

		return interaction.channel.send({
			embeds: [logEmbedEnd],
		})
	},
}
