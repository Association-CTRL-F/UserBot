import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('fetchh').setDescription('Fetchh'),
	interaction: async interaction => {
		// Création de l'embed start
		const logEmbedStart = new EmbedBuilder()
			.setColor('57C92A')
			.setDescription(
				`**START** FETCH ALL GUILD MEMBERS : **${interaction.guild.memberCount} MEMBERS**\n\nACTION : "Change ton pseudo"`,
			)
			.setTimestamp(new Date())

		await interaction.channel.send({
			embeds: [logEmbedStart],
		})

		// Fetch
		let userCount = 0
		await interaction.guild.members.fetch().then(members =>
			members.forEach(async member => {
				if (!member.user.bot && member.nickname === 'Change ton pseudo') {
					userCount += 1
					await interaction.channel.send({
						content: `Modifié ✅ | ${member.user.username} (Nickname : ${member.nickname} ; ID : ${member.user.id} ; Mention : <@${member.user.id}>)`,
					})
					await member.setNickname(null, 'No nicknames allowed!')
				}
			}),
		)

		// Création de l'embed end
		const logEmbedEnd = new EmbedBuilder()
			.setColor('57C92A')
			.setDescription(
				`**END** FETCH ALL GUILD MEMBERS : **${interaction.guild.memberCount}**\n\nACTION : "Change ton pseudo"\n\nMEMBERS TRIGGERED : **${userCount}**`,
			)
			.setTimestamp(new Date())

		return interaction.channel.send({
			embeds: [logEmbedEnd],
		})
	},
}
