import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js'
import {
	pluralizeWithoutQuantity as pluralize,
	displayNameAndID,
	convertDateForDiscord,
	splitMessage,
} from '../../util/util.js'

const isEmbedExceedingLimits = (embeds) =>
	embeds.reduce((acc, { title, description, fields, footer, author }) => {
		let sum = 0

		if (title) sum += title.length
		if (description) sum += description.length

		if (fields?.length) {
			sum += fields.reduce((fieldsAcc, field) => {
				return fieldsAcc + field.name.length + field.value.length
			}, 0)
		}

		if (footer?.text) sum += footer.text.length
		if (author?.name) sum += author.name.length

		return acc + sum
	}, 0) > 6000

export default {
	data: new SlashCommandBuilder()
		.setName('clean')
		.setDescription('Supprime un nombre de messages donnés dans le salon')
		.addIntegerOption((option) =>
			option
				.setName('nombre')
				.setDescription('Nombre de messages à supprimer (1 à 99)')
				.setMinValue(1)
				.setMaxValue(99)
				.setRequired(true),
		)
		.addBooleanOption((option) =>
			option.setName('silent').setDescription('Exécuter la commande silencieusement'),
		),

	interaction: async (interaction, client) => {
		const chosenNumber = interaction.options.getInteger('nombre')
		const silent = interaction.options.getBoolean('silent') ?? false

		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.LOGS_MESSAGES_CHANNEL_ID,
		)

		if (!logsChannel) {
			return interaction.reply({
				content: "Il n'y a pas de salon pour log l'action 😕",
				flags: MessageFlags.Ephemeral,
			})
		}

		const fetchedMessages = (
			await interaction.channel.messages.fetch({ limit: chosenNumber + 1 })
		).filter((fetchedMessage) => !fetchedMessage.pinned)

		const deletedMessages = await interaction.channel.bulkDelete(fetchedMessages, true)

		// On enlève le message de commande si présent
		deletedMessages.delete(interaction.id)

		const nbDeletedMessages = deletedMessages.size

		if (nbDeletedMessages === 0) {
			return interaction.reply({
				content: 'Aucun message supprimé 😕',
				flags: silent ? MessageFlags.Ephemeral : undefined,
			})
		}

		const messageLabel = pluralize('message', nbDeletedMessages)
		const deletedLabel = pluralize('supprimé', nbDeletedMessages)

		await interaction.reply({
			content: `${nbDeletedMessages} ${messageLabel} ${deletedLabel} 👌`,
			flags: silent ? MessageFlags.Ephemeral : undefined,
		})

		const text = deletedMessages
			.sort((messageA, messageB) => messageA.createdTimestamp - messageB.createdTimestamp)
			.reduce((acc, deletedMessage) => {
				return `${acc}${convertDateForDiscord(deletedMessage.createdAt)} ${
					deletedMessage.member ?? deletedMessage.author
				}: ${deletedMessage.content}\n`
			}, '')

		if (text.length > 4096) {
			const splitDescriptions = splitMessage(text, { maxLength: 4096 })
			const firstDescription = splitDescriptions.shift()
			const lastDescription = splitDescriptions.pop()

			const embeds = [
				new EmbedBuilder()
					.setColor('#0000FF')
					.setTitle('Clean')
					.setDescription(firstDescription)
					.setAuthor({
						name: displayNameAndID(interaction.member, interaction.user),
						iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					}),
				...splitDescriptions.map((description) => ({
					color: '#0000FF',
					description,
				})),
				new EmbedBuilder()
					.setColor('#0000FF')
					.setDescription(lastDescription)
					.setFooter({
						iconURL: interaction.member.displayAvatarURL({ dynamic: true }),
						text: `Exécuté par ${interaction.user.tag} dans #${interaction.channel.name}`,
					})
					.setTimestamp(new Date()),
			]

			if (!isEmbedExceedingLimits(embeds)) {
				return logsChannel.send({ embeds })
			}

			for (const embed of embeds) {
				await logsChannel.send({ embeds: [embed] })
			}

			return
		}

		const embed = new EmbedBuilder()
			.setColor('#0000FF')
			.setTitle('Clean')
			.setDescription(text)
			.setFooter({
				iconURL: interaction.member.displayAvatarURL({ dynamic: true }),
				text: `Exécuté par ${interaction.user.tag} dans #${interaction.channel.name}`,
			})
			.setTimestamp(new Date())

		return logsChannel.send({
			embeds: [embed],
		})
	},
}
