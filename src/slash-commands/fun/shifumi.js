import {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ComponentType,
} from 'discord.js'
import { isGuildSetup, convertDateForDiscord } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('shifumi')
		.setDescription('Shifumi! (pierre, feuille, ciseau)'),
	interaction: async (interaction, client) => {
		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.reply({
				content: "Le serveur n'est pas entièrement configuré 😕",
				ephemeral: true,
			})

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply()

		// Création de l'embed
		const embed = new EmbedBuilder()
			.setColor('#1ABC9C')
			.setTitle('Shifumi!')
			.setDescription(`Qui veut jouer avec ${interaction.user} ?\n\nCliquez sur 👋`)
			.setThumbnail('attachment://shifumi.png')

		const awaitPlayer = await interaction.editReply({
			embeds: [embed],
			files: [`./config/commands/shifumi/shifumi.png`],
		})

		// Ajout de la réaction
		const reaction = await awaitPlayer.react('👋')

		// Filtre pour la réaction
		const reactionFilter = (emoji, user) =>
			interaction.guild.members.cache.get(user.id) && !user.bot

		// Création du collecteur de réactions
		const reactions = await awaitPlayer.awaitReactions({
			filter: reactionFilter,
			// Une seule réaction / émoji / user
			max: 1,
			maxEmojis: 1,
			maxUsers: 1,
			// 12 heures = 4,32e+7 ms
			idle: 43200000,
		})

		// Si réaction correcte ajoutée ou temps écoulé,
		// on supprime les réactions ajoutées
		await reaction.remove()

		// Acquisition de l'user de la réaction
		const { users: reactionUsers } = reactions.first()
		const reactionUser = reactionUsers.cache.filter(user => !user.bot).first()

		// Modification de l'embed et envoi
		const embedStart = new EmbedBuilder()
			.setColor('#1ABC9C')
			.setTitle('Shifumi!')
			.setDescription(
				`${reactionUser} a accepté le shifumi avec ${
					interaction.user
				} !\n\nCliquez chacun sur un des boutons ci-dessous pour valider votre choix.\n\nTemps : ${convertDateForDiscord(
					Math.round(Date.now() + 10000),
					true,
				)}`,
			)
			.setThumbnail('attachment://shifumi.png')

		const buttons = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder().setCustomId('pierre').setEmoji('🪨').setStyle('Secondary'),
			)
			.addComponents(
				new ButtonBuilder().setCustomId('feuille').setEmoji('📰').setStyle('Secondary'),
			)
			.addComponents(
				new ButtonBuilder().setCustomId('ciseaux').setEmoji('✂️').setStyle('Secondary'),
			)

		const reply = await interaction.editReply({
			embeds: [embedStart],
			files: [`./config/commands/shifumi/shifumi.png`],
			components: [buttons],
		})

		// Jeu
		const outcomes = {
			pierre: { pierre: null, feuille: false, ciseaux: true },
			feuille: { pierre: true, feuille: null, ciseaux: false },
			ciseaux: { pierre: false, feuille: true, ciseaux: null },
		}

		let playerOneChoice = ''
		let playerTwoChoice = ''
		let winner = ''
		let loser = ''
		let winnerChoice = ''
		let loserChoice = ''

		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 10000,
		})

		// Collecte des réponses
		collector.on('collect', i => {
			if (i.user === interaction.user)
				if (playerOneChoice === '') {
					playerOneChoice = i.customId
					i.reply({ content: 'Réponse enregistrée 👌', ephemeral: true })
				} else {
					i.reply({ content: 'Tu as déjà validé ta réponse 😬', ephemeral: true })
				}
			else if (i.user === reactionUser)
				if (playerTwoChoice === '') {
					playerTwoChoice = i.customId
					i.reply({ content: 'Réponse enregistrée 👌', ephemeral: true })
				} else {
					i.reply({ content: 'Tu as déjà validé ta réponse 😬', ephemeral: true })
				}
			else i.reply({ content: 'Tu ne fais pas partie du jeu 😬', ephemeral: true })
		})

		// Affichage du gagnant
		collector.on('end', () => {
			if (playerOneChoice === '' || playerTwoChoice === '') {
				return interaction.editReply({
					embeds: [
						embedStart.setDescription(
							`${reactionUser} a accepté le shifumi avec ${interaction.user} !\n\nLes joueurs n'ont rien choisi 😬`,
						),
					],
					components: [],
				})
			} else if (outcomes[playerOneChoice][playerTwoChoice] === null) {
				return interaction.editReply({
					embeds: [
						embedStart.setDescription(
							`${reactionUser} a accepté le shifumi avec ${interaction.user} !\n\nLes joueurs ont choisi le même symbole (${playerOneChoice}) 😕`,
						),
					],
					components: [],
				})
			} else if (outcomes[playerOneChoice][playerTwoChoice]) {
				winner = interaction.user
				winnerChoice = playerOneChoice
				loser = reactionUser
				loserChoice = playerTwoChoice
			} else {
				winner = reactionUser
				winnerChoice = playerTwoChoice
				loser = interaction.user
				loserChoice = playerOneChoice
			}

			// Modification de l'embed et envoi
			const embedFin = new EmbedBuilder()
				.setColor('#1ABC9C')
				.setTitle('Shifumi!')
				.setDescription(
					`${winner} a gagné le shifumi contre ${loser} !\n\n➡️ **${winnerChoice}** vs **${loserChoice}**`,
				)
				.setThumbnail('attachment://shifumi.png')

			return interaction.editReply({
				embeds: [embedFin],
				files: [`./config/commands/shifumi/shifumi.png`],
				components: [],
			})
		})
	},
}
