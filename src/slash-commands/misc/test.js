import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('test').setDescription('Test'),
	interaction: async interaction => {
		// Création de l'embed start
		const logEmbedStart = new EmbedBuilder()
			.setColor('57C92A')
			.setDescription(
				`**START** FETCH ALL GUILD MEMBERS : **${interaction.guild.memberCount} MEMBERS**`,
			)
			.setTimestamp(new Date())

		await interaction.channel.send({
			embeds: [logEmbedStart],
		})

		// Fetch
		await interaction.guild.members.fetch().then(members =>
			members.forEach(async member => {
				const date1 = new Date('2023-04-21')
				const date2 = new Date(member.joinedAt)

				if (
					!member.user.bot &&
					!member.roles.cache.has('475406297127452673') &&
					!member.roles.cache.has('768209418319822868') &&
					member.pending === true &&
					date2 < date1
				)
					await interaction.channel.send({
						content: `${member.user.username} (ID : ${member.user.id}) n'a pas de rôle et pending = true`,
					})
			}),
		)

		// Création de l'embed end
		const logEmbedEnd = new EmbedBuilder()
			.setColor('57C92A')
			.setDescription(
				`**END** FETCH ALL GUILD MEMBERS : **${interaction.guild.memberCount} MEMBERS**`,
			)
			.setTimestamp(new Date())

		return interaction.channel.send({
			embeds: [logEmbedEnd],
		})
	},
}
