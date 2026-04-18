import {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
	MessageFlags
} from 'discord.js'
import { convertDate, displayNameAndID } from '../../util/util.js'

const buildVoteEmbed = ({
	proposition,
	member,
	user,
	description = null,
	edited = false,
	createdAt = new Date(),
	editedAt = null,
}) => {
	const embed = new EmbedBuilder()
		.setColor(0x00ff00)
		.setTitle(edited ? 'Nouveau vote (modifié)' : 'Nouveau vote')
		.setAuthor({
			name: displayNameAndID(member, user),
			iconURL: user.displayAvatarURL({ dynamic: true }),
		})
		.addFields({
			name: 'Proposition',
			value: `\`\`\`${proposition}\`\`\``,
		})

	if (description) {
		embed.setDescription(description)
	}

	const footerLines = [`Vote posté le ${convertDate(createdAt)}`]
	if (editedAt) {
		footerLines.push(`Modifié le ${convertDate(editedAt)}`)
	}

	embed.setFooter({
		text: footerLines.join('\n'),
	})

	return embed
}

const anonymousButtons = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setEmoji('✅').setCustomId('yes').setStyle(ButtonStyle.Secondary),
	new ButtonBuilder().setEmoji('⌛').setCustomId('wait').setStyle(ButtonStyle.Secondary),
	new ButtonBuilder().setEmoji('❌').setCustomId('no').setStyle(ButtonStyle.Secondary),
)

export default {
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('Gère les votes')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Crée un embed avec la proposition et des émojis pour voter')
				.addStringOption((option) =>
					option
						.setName('proposition')
						.setDescription('Proposition de vote')
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName('anonyme')
						.setDescription('Veux-tu que le vote soit anonyme ?')
						.setRequired(true),
				)
				.addBooleanOption((option) =>
					option
						.setName('thread')
						.setDescription('Veux-tu créer un thread associé ?')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription('Modifie un message de vote avec la nouvelle proposition')
				.addStringOption((option) =>
					option
						.setName('id')
						.setDescription('ID de la proposition à éditer')
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('proposition')
						.setDescription('Nouvelle proposition de vote')
						.setRequired(true),
				),
		),

	interaction: async (interaction) => {
		switch (interaction.options.getSubcommand()) {
			case 'create': {
				const proposition = interaction.options.getString('proposition').trim()
				const anonyme = interaction.options.getBoolean('anonyme')
				const thread = interaction.options.getBoolean('thread')

				const embed = buildVoteEmbed({
					proposition,
					member: interaction.member,
					user: interaction.user,
					description: anonyme ? '✅ : 0\n⌛ : 0\n❌ : 0' : null,
				})

				const sentMessage = await interaction.reply({
					embeds: [embed],
					components: anonyme ? [anonymousButtons] : [],
					fetchReply: true,
				})

				if (thread) {
					const threadCreate = await sentMessage.startThread({
						name: `Vote de ${interaction.user.username}`,
						autoArchiveDuration: 24 * 60,
						reason: proposition,
					})

					await threadCreate.members.add(interaction.user.id).catch(() => null)
				}

				if (!anonyme) {
					await sentMessage.react('✅')
					await sentMessage.react('⌛')
					await sentMessage.react('❌')
				}

				return
			}

			case 'edit': {
				const proposition = interaction.options.getString('proposition').trim()
				const receivedID = interaction.options.getString('id')
				const matchID = receivedID.match(/^\d{17,19}$/)

				if (!matchID) {
					return interaction.reply({
						content: "Tu ne m'as pas donné un ID valide 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const message = await interaction.channel.messages
					.fetch(matchID[0])
					.catch((error) => {
						if (error.code === RESTJSONErrorCodes.UnknownMessage) {
							return null
						}

						throw error
					})

				if (!message) {
					return interaction.reply({
						content: "Je n'ai pas trouvé ce message dans ce salon 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const sourceEmbed = message.embeds?.[0]
				const propositionField = sourceEmbed?.fields?.find(
					(field) => field.name === 'Proposition',
				)

				if (
					!sourceEmbed ||
					!propositionField ||
					!message.author ||
					message.author.id !== interaction.client.user.id
				) {
					return interaction.reply({
						content: "Le message initial n'est pas un vote 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const originalUserId =
					message.interactionMetadata?.user?.id ?? message.interaction?.user?.id ?? null

				if (originalUserId && originalUserId !== interaction.user.id) {
					return interaction.reply({
						content: "Tu n'as pas initié ce vote 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				const embedEdit = buildVoteEmbed({
					proposition,
					member: interaction.member,
					user: interaction.user,
					description: sourceEmbed.description ?? null,
					edited: true,
					createdAt: message.createdAt,
					editedAt: new Date(),
				})

				await message.edit({
					embeds: [embedEdit],
				})

				return interaction.reply({
					content: 'Proposition de vote modifiée 👌',
					flags: MessageFlags.Ephemeral,
				})
			}
		}
	},
}
