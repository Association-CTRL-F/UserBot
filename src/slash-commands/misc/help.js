import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageEmbed } from 'discord.js'
const capitalize = string => `${string.charAt(0).toUpperCase()}${string.slice(1)}`

export default {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Affiche les commandes fixes du bot')
		.addStringOption(option =>
			option
				.setName('commande')
				.setDescription("Nom de la commande où l'on veut des détails"),
		),
	interaction: (interaction, client) => {
		// Si aucun argument, on montre la liste des commandes principales
		const commandeName = interaction.options.getString('commande')
		if (!commandeName) {
			const fields = []
			client.commandsCategories.forEach((commandsNames, category) => {
				const commandsDescription = commandsNames.reduce((acc, commandName) => {
					const command = client.commands.get(commandName)
					return `${acc}- \`${commandName}\` : ${command.data.description}.\n`
				}, '')

				fields.push({
					name: capitalize(category),
					value: commandsDescription,
				})
			})

			const embed = new MessageEmbed()
				.setColor('FF8000')
				.setTitle('Commandes principales disponibles')
				.setDescription(
					'Certaines commandes sont réservées au staff du serveur, elles ne sont donc pas visibles pour les membres.',
				)
				.addFields(fields)

			return interaction.reply({
				embeds: [embed],
			})
		}

		// Acquisition de la commande
		const command = client.commands.get(commandeName)
		if (!command)
			return interaction.reply({
				content: `Je n'ai pas trouvé la commande **${commandeName}** 😕`,
				ephemeral: true,
			})

		// Création de l'embed avec les options
		const embed = new MessageEmbed()
			.setColor('FF8000')
			.setTitle(command.data.name)
			.setDescription(command.data.description)

		return interaction.reply({ embeds: [embed] })
	},
}
