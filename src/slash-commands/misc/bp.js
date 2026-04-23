import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	ActionRowBuilder,
	TextInputStyle,
	EmbedBuilder,
	RESTJSONErrorCodes,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('bp')
		.setDescription('Crée un bon-plan')
		.addSubcommand((subcommand) =>
			subcommand.setName('create').setDescription('Crée un nouveau bon-plan'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('end')
				.setDescription('Clôture un bon-plan')
				.addStringOption((option) =>
					option
						.setName('id')
						.setDescription('ID du bon-plan à clôturer')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('del')
				.setDescription('Supprime un bon-plan')
				.addStringOption((option) =>
					option
						.setName('id')
						.setDescription('ID du bon-plan à supprimer')
						.setRequired(true),
				),
		),

	interaction: async (interaction, client) => {
		const subcommand = interaction.options.getSubcommand()

		// Create : on affiche juste la modal
		if (subcommand === 'create') {
			const modalCreate = new ModalBuilder()
				.setCustomId('bp')
				.setTitle('Création de bon-plan')
				.addComponents(
					new ActionRowBuilder().addComponents(
						new TextInputBuilder()
							.setCustomId('bp-titre')
							.setLabel('Donnez un titre à votre bon-plan')
							.setStyle(TextInputStyle.Short)
							.setMinLength(1)
							.setRequired(true),
					),
					new ActionRowBuilder().addComponents(
						new TextInputBuilder()
							.setCustomId('bp-description')
							.setLabel('Donnez une description courte du bon-plan')
							.setStyle(TextInputStyle.Short)
							.setMinLength(1)
							.setRequired(true),
					),
					new ActionRowBuilder().addComponents(
						new TextInputBuilder()
							.setCustomId('bp-lien')
							.setLabel('Donnez le lien du bon-plan')
							.setStyle(TextInputStyle.Short)
							.setMinLength(1)
							.setRequired(true),
					),
				)

			return interaction.showModal(modalCreate)
		}

		// End / Del : on diffère la réponse
		await interaction.deferReply()

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		// Acquisition du salon
		const bpChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.BP_CHANNEL_ID,
		)

		if (!bpChannel || !bpChannel.isTextBased()) {
			return interaction.editReply({
				content: 'Impossible de trouver le salon des bons plans 😕',
			})
		}

		const receivedId = interaction.options.getString('id')
		const matchId = receivedId?.match(/^\d{17,19}$/)

		if (!matchId) {
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID valide 😕",
			})
		}

		// Fetch du message
		const targetMessage = await bpChannel.messages.fetch(matchId[0]).catch((error) => {
			if (error.code === RESTJSONErrorCodes.UnknownMessage) {
				return null
			}

			throw error
		})

		if (!targetMessage) {
			return interaction.editReply({
				content: `Je n'ai pas trouvé ce message dans le salon <#${bpChannel.id}> 😕`,
			})
		}

		switch (subcommand) {
			// Clôturer un bon-plan
			case 'end': {
				const sourceEmbed = targetMessage.embeds?.[0]

				if (!sourceEmbed?.footer?.text?.startsWith('Bon-plan')) {
					return interaction.editReply({
						content: "Le message initial n'est pas un bon-plan 😕",
					})
				}

				const endedTitle = sourceEmbed.title?.startsWith('[TERMINÉ] ')
					? sourceEmbed.title
					: `[TERMINÉ] ${sourceEmbed.title ?? 'Bon-plan'}`

				const embedEdit = new EmbedBuilder()
					.setColor('#8DA1AC')
					.setTitle(endedTitle)
					.setURL(sourceEmbed.url ?? null)
					.setDescription(sourceEmbed.description ?? null)
					.setFooter({
						iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
						text: `Bon-plan clôturé par ${interaction.user.tag}`,
					})

				if (sourceEmbed.author) {
					embedEdit.setAuthor({
						name: sourceEmbed.author.name,
						iconURL: sourceEmbed.author.iconURL ?? undefined,
						url: sourceEmbed.author.url ?? undefined,
					})
				}

				if (sourceEmbed.thumbnail?.url) {
					embedEdit.setThumbnail(sourceEmbed.thumbnail.url)
				}

				if (sourceEmbed.image?.url) {
					embedEdit.setImage(sourceEmbed.image.url)
				}

				if (sourceEmbed.fields?.length) {
					embedEdit.addFields(sourceEmbed.fields)
				}

				await targetMessage.edit({
					embeds: [embedEdit],
				})

				return interaction.editReply({
					content: 'Le bon-plan a bien été clôturé 👌',
				})
			}

			// Supprimer un bon-plan
			case 'del': {
				await targetMessage.delete()

				return interaction.editReply({
					content: 'Le bon-plan a bien été supprimé 👌',
				})
			}
		}
	},
}
