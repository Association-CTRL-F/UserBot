/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
} from 'discord.js'
import { convertDate, displayNameAndID } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('Gère les votes')
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Crée un embed avec la proposition et des émojis pour voter')
				.addStringOption(option =>
					option
						.setName('proposition')
						.setDescription('Proposition de vote')
						.setRequired(true),
				)
				.addBooleanOption(option =>
					option
						.setName('anonyme')
						.setDescription('Veux-tu que le vote soit anonyme ?')
						.setRequired(true),
				)
				.addBooleanOption(option =>
					option
						.setName('thread')
						.setDescription('Veux-tu créer un thread associé ?')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('edit')
				.setDescription('Modifie un message de vote avec la nouvelle proposition')
				.addStringOption(option =>
					option
						.setName('id')
						.setDescription('ID de la proposition à éditer')
						.setRequired(true),
				)
				.addStringOption(option =>
					option
						.setName('proposition')
						.setDescription('Nouvelle proposition de vote')
						.setRequired(true),
				),
		),
	interaction: async interaction => {
		const proposition = interaction.options.getString('proposition')
		const anonyme = interaction.options.getBoolean('anonyme')
		const thread = interaction.options.getBoolean('thread')

		switch (interaction.options.getSubcommand()) {
			// Nouveau vote
			case 'create':
				// Envoi du message de vote
				const embed = new EmbedBuilder()
					.setColor('00FF00')
					.setTitle('Nouveau vote')
					.addFields([
						{
							name: 'Proposition',
							value: `\`\`\`${proposition}\`\`\``,
						},
					])
					.setAuthor({
						name: displayNameAndID(interaction.member),
						iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					})
					.setFooter({
						text: `Vote posté le ${convertDate(new Date())}`,
					})

				if (anonyme) {
					const buttons = new ActionRowBuilder()
						.addComponents(
							new ButtonBuilder()
								.setEmoji('✅')
								.setCustomId('yes')
								.setStyle(ButtonStyle.Secondary),
						)
						.addComponents(
							new ButtonBuilder()
								.setEmoji('⌛')
								.setCustomId('wait')
								.setStyle(ButtonStyle.Secondary),
						)
						.addComponents(
							new ButtonBuilder()
								.setEmoji('❌')
								.setCustomId('no')
								.setStyle(ButtonStyle.Secondary),
						)

					embed.data.description = `✅ : 0\r⌛ : 0\r❌ : 0`

					const sentMessage = await interaction.reply({
						embeds: [embed],
						components: [buttons],
						fetchReply: true,
					})

					// Création automatique du thread associé
					if (thread) {
						const threadCreate = await sentMessage.startThread({
							name: `Vote de ${interaction.member.displayName}`,
							// Archivage après 24H
							autoArchiveDuration: 24 * 60,
							reason: proposition,
						})

						return threadCreate.members.add(interaction.user.id)
					}

					return
				}

				const sentMessage = await interaction.reply({
					embeds: [embed],
					fetchReply: true,
				})

				// Création automatique du thread associé
				if (thread) {
					const threadCreate = await sentMessage.startThread({
						name: `Vote de ${interaction.member.displayName}`,
						// Archivage après 24H
						autoArchiveDuration: 24 * 60,
						reason: proposition,
					})

					await threadCreate.members.add(interaction.user.id)
				}

				// Ajout des réactions pour voter si vote non anonyme
				await sentMessage.react('✅')
				await sentMessage.react('⌛')
				return sentMessage.react('❌')

			// Modification d'un vote
			case 'edit':
				const receivedID = interaction.options.getString('id')
				const matchID = receivedID.match(/^(\d{17,19})$/)
				if (!matchID)
					return interaction.reply({
						content: "Tu ne m'as pas donné un ID valide 😕",
						ephemeral: true,
					})

				// Fetch du message
				const message = await interaction.channel.messages
					.fetch(matchID[0])
					.catch(error => {
						if (error.code === RESTJSONErrorCodes.UnknownMessage) {
							interaction.reply({
								content: "Je n'ai pas trouvé ce message dans ce salon 😕",
								ephemeral: true,
							})

							return error
						}

						throw error
					})

				// Handle des mauvais cas
				if (message instanceof Error) return
				if (!message.interaction || message.interaction.commandName !== 'vote create')
					return interaction.reply({
						content: "Le message initial n'est pas un vote 😕",
						ephemeral: true,
					})

				if (message.interaction.user !== interaction.member.user)
					return interaction.reply({
						content: "Tu n'as pas initié ce vote 😕",
						ephemeral: true,
					})

				// Modification du message
				const embedEdit = new EmbedBuilder()
					.setColor('00FF00')
					.setTitle('Nouveau vote (modifié)')
					.addFields([
						{
							name: 'Proposition',
							value: `\`\`\`${proposition}\`\`\``,
						},
					])
					.setAuthor({
						name: displayNameAndID(interaction.member),
						iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					})
					.setFooter({
						text: `Vote posté le ${convertDate(
							message.createdAt,
						)}\nModifié le ${convertDate(new Date())}`,
					})

				// eslint-disable-next-line no-prototype-builtins
				if (message.embeds[0].data.hasOwnProperty('description'))
					embedEdit.data.description = message.embeds[0].data.description

				await message.edit({
					embeds: [embedEdit],
				})

				return interaction.reply({
					content: 'Proposition de vote modifiée 👌',
					ephemeral: true,
				})
		}
	},
}
