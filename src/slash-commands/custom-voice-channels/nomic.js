import { displayNameAndID } from '../../util/util.js'
import { ChannelType, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('nomic')
		.setDescription(
			'Crée un salon textuel nomic si tu es connecté dans un salon vocal personnalisé',
		),

	interaction: async (interaction, client) => {
		await interaction.deferReply()

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		const voiceChannel = interaction.member?.voice?.channel

		// Si l'utilisateur n'est pas dans un salon vocal
		if (!voiceChannel) {
			return interaction.editReply({
				content: 'Tu dois être dans un salon vocal pour utiliser cette commande 😕',
			})
		}

		// Si l'utilisateur n'est pas dans un salon vocal personnalisé
		if (!client.voiceManager.has(voiceChannel.id)) {
			return interaction.editReply({
				content:
					'Tu dois être dans un salon vocal personnalisé pour utiliser cette commande 😕',
			})
		}

		// Check s'il y a déjà un salon no-mic
		const existingNoMicChannel = client.voiceManager.get(voiceChannel.id)
		if (existingNoMicChannel) {
			return interaction.editReply({
				content: `Il y a déjà un salon no-mic : ${existingNoMicChannel} 😕`,
			})
		}

		let noMicChannel = null

		try {
			// Création du salon no-mic
			noMicChannel = await interaction.guild.channels.create({
				name: `No-mic ${voiceChannel.name}`,
				type: ChannelType.GuildText,
				topic: `Salon temporaire créé pour ${displayNameAndID(
					interaction.member,
					interaction.user,
				)}`,
				parent: voiceChannel.parent ?? undefined,
			})

			// Suppression des permissions existantes sauf
			// pour les rôles qui peuvent supprimer les messages (Modos)
			// ou qui ne peuvent pas envoyer de messages (Muted)
			const overwritesToDelete = noMicChannel.permissionOverwrites.cache.filter(
				(overwrite) =>
					!(overwrite.allow.has('ManageMessages') || overwrite.deny.has('SendMessages')),
			)

			await Promise.all(
				overwritesToDelete.map((overwrite) =>
					noMicChannel.permissionOverwrites.delete(overwrite.id).catch(() => null),
				),
			)

			// Setup des permissions
			await Promise.all([
				// Accès au salon pour les membres présents
				...voiceChannel.members.map((member) =>
					noMicChannel.permissionOverwrites.edit(member.id, {
						CreateInstantInvite: false,
						ViewChannel: true,
						SendMessages: true,
						ReadMessageHistory: true,
					}),
				),
				// Pas d'accès pour @everyone
				noMicChannel.permissionOverwrites.edit(interaction.guild.id, {
					ViewChannel: false,
				}),
			])

			// Ajout du salon dans la map
			client.voiceManager.set(voiceChannel.id, noMicChannel)

			return interaction.editReply({
				content: `Ton salon a bien été créé : ${noMicChannel} 👌`,
			})
		} catch (error) {
			console.error(error)

			if (noMicChannel) {
				await noMicChannel.delete().catch(() => null)
			}

			return interaction.editReply({
				content: 'Une erreur est survenue lors de la création du salon no-mic 😕',
			})
		}
	},
}
