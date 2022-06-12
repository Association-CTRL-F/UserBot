import {
	pluralizeWithoutQuantity as pluralize,
	displayNameAndID,
	convertDateForDiscord,
} from '../../util/util.js'
import { Util, MessageEmbed } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

const isEmbedExceedingLimits = embeds =>
	embeds.reduce((acc, { title, description, fields, footer, author }) => {
		let sum = 0
		if (title) sum += title.length
		if (description) sum += description.length
		if (fields && fields.length > 0)
			sum += fields.reduce(
				(accBis, field) => accBis + field.name.length + field.value.length,
				0,
			)
		if (footer) sum += footer.text.length
		if (author) sum += author.name.length

		return acc + sum
	}, 0) > 6000

export default {
	data: new SlashCommandBuilder()
		.setName('clean')
		.setDescription('Supprime un nombre de messages donnés dans le salon')
		.addIntegerOption(option =>
			option
				.setName('nombre')
				.setDescription('Nombre de messages à supprimer (1 à 99)')
				.setMinValue(1)
				.setMaxValue(99)
				.setRequired(true),
		)
		.addBooleanOption(option =>
			option.setName('silent').setDescription('Exécuter la commande silencieusement'),
		),
	interaction: async (interaction, client) => {
		// Acquisition du nombre de messages à supprimer et du silent
		const chosenNumber = interaction.options.getInteger('nombre')
		const ephemeral = interaction.options.getBoolean('silent')

		// Acquisition du salon de logs
		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.logsMessagesChannelID,
		)
		if (!logsChannel)
			return interaction.reply({
				content: "Il n'y a pas de salon pour log l'action 😕",
				ephemeral: true,
			})

		// Acquisition des messages et filtrage des épinglés
		const fetchedMessages = (
			await interaction.channel.messages.fetch({ limit: chosenNumber })
		).filter(fetchedMessage => !fetchedMessage.pinned)

		// Suppression des messages
		const deletedMessages = await interaction.channel.bulkDelete(fetchedMessages, true)
		// Exclusion du message de la commande
		deletedMessages.delete(interaction.id)
		if (deletedMessages.size === 0)
			return interaction.reply({
				content: 'Aucun message supprimé 😕',
				ephemeral: true,
			})

		// Réponse pour l'utilisateur
		const nbDeletedMessages = deletedMessages.size
		await interaction.reply({
			content: `${nbDeletedMessages} ${pluralize('message', nbDeletedMessages)} ${pluralize(
				'supprimé',
				nbDeletedMessages,
			)} 👌`,
			ephemeral: ephemeral,
		})

		// Partie logs
		// Tri décroissant en fonction de l'heure à laquelle le message a été
		// posté pour avoir une lecture du haut vers le bas comme sur Discord
		const text = deletedMessages
			.sort((messageA, messageB) => messageA.createdTimestamp - messageB.createdTimestamp)
			.reduce(
				(acc, deletedMessage) =>
					`${acc}${convertDateForDiscord(deletedMessage.createdAt)} ${
						deletedMessage.member
					}: ${deletedMessage.content}\n`,
				'',
			)

		// Envoi plusieurs embeds si les logs ne tiennent pas dans un seul embed
		if (text.length > 4096) {
			// Séparation des messages pour 3 embeds :
			// 1er : titre + 1ère partie des messages
			// 2nd : 2nd partie des messsages
			// 3ème: 3ème partie des messages + fields exécuté par / le et salon
			const splitedDescriptions = Util.splitMessage(text, { maxLength: 4096 })
			const firstDescription = splitedDescriptions.shift()
			const lastDescription = splitedDescriptions.pop()

			const embeds = [
				new MessageEmbed()
					.setColor('0000FF')
					.setTitle('Clean')
					.setDescription(firstDescription)
					.setAuthor({
						name: `${displayNameAndID(interaction.member, interaction.user)}`,
						iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					})
					.addFields([
						{
							name: 'Clean',
							value: firstDescription,
						},
					]),
				...splitedDescriptions.map(description => ({
					color: '0000FF',
					description: description,
				})),
				new MessageEmbed()
					.setColor('0000FF')
					.setTitle('Clean')
					.setDescription(lastDescription)
					.setAuthor({
						name: `${displayNameAndID(interaction.member, interaction.user)}`,
						iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					})
					.addFields([
						{
							name: 'Salon',
							value: interaction.channel.toString(),
							inline: true,
						},
						{
							name: 'Exécuté par',
							value: interaction.member.toString(),
							inline: true,
						},
						{
							name: 'Exécuté le',
							value: convertDateForDiscord(Date.now()),
							inline: true,
						},
					]),
			]

			if (!isEmbedExceedingLimits(embeds)) return logsChannel.send({ embeds: embeds })

			// eslint-disable-next-line no-await-in-loop
			for (const embed of embeds) await logsChannel.send({ embeds: [embed] })

			return
		}

		// Si les messages tiennent dans un seul embed
		const embed = new MessageEmbed()
			.setColor('0000FF')
			.setTitle('Clean')
			.setDescription(text)
			.setAuthor({
				name: `${displayNameAndID(interaction.member, interaction.user)}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
			})
			.addFields([
				{
					name: 'Salon',
					value: interaction.channel.toString(),
					inline: true,
				},
				{
					name: 'Exécuté par',
					value: interaction.member.toString(),
					inline: true,
				},
				{
					name: 'Exécuté le',
					value: convertDateForDiscord(Date.now()),
					inline: true,
				},
			])

		return logsChannel.send({
			embeds: [embed],
		})
	},
}
