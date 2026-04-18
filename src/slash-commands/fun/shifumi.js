import {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	AttachmentBuilder,
	MessageFlags
} from 'discord.js'
import { convertDateForDiscord } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('shifumi')
		.setDescription('Shifumi! (pierre, feuille, ciseau)'),

	interaction: async (interaction) => {
		await interaction.deferReply()

		const shifumiFile = new AttachmentBuilder('./config/commands/shifumi/shifumi.png')

		// Message d'attente d'un adversaire
		const embed = new EmbedBuilder()
			.setColor('#1ABC9C')
			.setTitle('Shifumi!')
			.setDescription(`Qui veut jouer avec ${interaction.user} ?\n\nCliquez sur 👋`)
			.setThumbnail('attachment://shifumi.png')

		const awaitPlayer = await interaction.editReply({
			embeds: [embed],
			files: [shifumiFile],
		})

		// Ajout de la réaction
		const reaction = await awaitPlayer.react('👋')

		// Filtre pour la réaction
		const reactionFilter = (messageReaction, user) =>
			messageReaction.emoji.name === '👋' &&
			!user.bot &&
			user.id !== interaction.user.id &&
			interaction.guild.members.cache.has(user.id)

		// Création du collecteur de réactions
		const reactions = await awaitPlayer.awaitReactions({
			filter: reactionFilter,
			max: 1,
			maxEmojis: 1,
			maxUsers: 1,
			idle: 43200000, // 12 heures
		})

		// On enlève uniquement la réaction du bot
		await reaction.users.remove(interaction.client.user.id).catch(() => null)

		// Si personne n'a accepté
		if (!reactions.size) {
			const timeoutEmbed = new EmbedBuilder()
				.setColor('#1ABC9C')
				.setTitle('Shifumi!')
				.setDescription(`Personne n'a accepté le shifumi de ${interaction.user} 😕`)
				.setThumbnail('attachment://shifumi.png')

			return interaction.editReply({
				embeds: [timeoutEmbed],
				files: [new AttachmentBuilder('./config/commands/shifumi/shifumi.png')],
			})
		}

		// Acquisition de l'user de la réaction
		const firstReaction = reactions.first()
		const reactionUser = firstReaction?.users.cache.find((user) => !user.bot)

		if (!reactionUser) {
			return interaction.editReply({
				content: "Impossible de récupérer l'adversaire 😕",
				embeds: [],
				components: [],
				files: [],
			})
		}

		// Modification de l'embed et envoi
		const embedStart = new EmbedBuilder()
			.setColor('#1ABC9C')
			.setTitle('Shifumi!')
			.setDescription(
				`${reactionUser} a accepté le shifumi avec ${
					interaction.user
				} !\n\nCliquez chacun sur un des boutons ci-dessous pour valider votre choix.\n\nTemps : ${convertDateForDiscord(
					Date.now() + 10000,
					true,
				)}`,
			)
			.setThumbnail('attachment://shifumi.png')

		const buttons = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('pierre')
				.setEmoji('🪨')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('feuille')
				.setEmoji('📰')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('ciseaux')
				.setEmoji('✂️')
				.setStyle(ButtonStyle.Secondary),
		)

		const reply = await interaction.editReply({
			embeds: [embedStart],
			files: [new AttachmentBuilder('./config/commands/shifumi/shifumi.png')],
			components: [buttons],
		})

		// Jeu
		const outcomes = {
			pierre: { pierre: null, feuille: false, ciseaux: true },
			feuille: { pierre: true, feuille: null, ciseaux: false },
			ciseaux: { pierre: false, feuille: true, ciseaux: null },
		}

		let playerOneChoice = null
		let playerTwoChoice = null

		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 10000,
		})

		// Collecte des réponses
		collector.on('collect', async (i) => {
			if (i.user.id === interaction.user.id) {
				if (!playerOneChoice) {
					playerOneChoice = i.customId
					await i.reply({ content: 'Réponse enregistrée 👌', flags: MessageFlags.Ephemeral })
				} else {
					await i.reply({ content: 'Tu as déjà validé ta réponse 😬', flags: MessageFlags.Ephemeral })
				}
				return
			}

			if (i.user.id === reactionUser.id) {
				if (!playerTwoChoice) {
					playerTwoChoice = i.customId
					await i.reply({ content: 'Réponse enregistrée 👌', flags: MessageFlags.Ephemeral })
				} else {
					await i.reply({ content: 'Tu as déjà validé ta réponse 😬', flags: MessageFlags.Ephemeral })
				}
				return
			}

			await i.reply({ content: 'Tu ne fais pas partie du jeu 😬', flags: MessageFlags.Ephemeral })
		})

		// Affichage du gagnant
		collector.on('end', async () => {
			if (!playerOneChoice) {
				const endEmbed = new EmbedBuilder()
					.setColor('#1ABC9C')
					.setTitle('Shifumi!')
					.setDescription(
						`${reactionUser} a accepté le shifumi avec ${interaction.user} !\n\n${interaction.user} n'a rien choisi 😬`,
					)
					.setThumbnail('attachment://shifumi.png')

				await interaction.editReply({
					embeds: [endEmbed],
					files: [new AttachmentBuilder('./config/commands/shifumi/shifumi.png')],
					components: [],
				})
				return
			}

			if (!playerTwoChoice) {
				const endEmbed = new EmbedBuilder()
					.setColor('#1ABC9C')
					.setTitle('Shifumi!')
					.setDescription(
						`${reactionUser} a accepté le shifumi avec ${interaction.user} !\n\n${reactionUser} n'a rien choisi 😬`,
					)
					.setThumbnail('attachment://shifumi.png')

				await interaction.editReply({
					embeds: [endEmbed],
					files: [new AttachmentBuilder('./config/commands/shifumi/shifumi.png')],
					components: [],
				})
				return
			}

			if (outcomes[playerOneChoice][playerTwoChoice] === null) {
				const endEmbed = new EmbedBuilder()
					.setColor('#1ABC9C')
					.setTitle('Shifumi!')
					.setDescription(
						`${reactionUser} a accepté le shifumi avec ${interaction.user} !\n\nLes joueurs ont choisi le même symbole (${playerOneChoice}) 😕`,
					)
					.setThumbnail('attachment://shifumi.png')

				await interaction.editReply({
					embeds: [endEmbed],
					files: [new AttachmentBuilder('./config/commands/shifumi/shifumi.png')],
					components: [],
				})
				return
			}

			const playerOneWins = outcomes[playerOneChoice][playerTwoChoice]
			const winner = playerOneWins ? interaction.user : reactionUser
			const loser = playerOneWins ? reactionUser : interaction.user
			const winnerChoice = playerOneWins ? playerOneChoice : playerTwoChoice
			const loserChoice = playerOneWins ? playerTwoChoice : playerOneChoice

			const embedFin = new EmbedBuilder()
				.setColor('#1ABC9C')
				.setTitle('Shifumi!')
				.setDescription(
					`${winner} a gagné le shifumi contre ${loser} !\n\n➡️ **${winnerChoice}** vs **${loserChoice}**`,
				)
				.setThumbnail('attachment://shifumi.png')

			await interaction.editReply({
				embeds: [embedFin],
				files: [new AttachmentBuilder('./config/commands/shifumi/shifumi.png')],
				components: [],
			})
		})
	},
}
