import { displayNameAndID } from '../../util/util.js'
import { ChannelType, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('nomic')
		.setDescription(
			'Crée un salon textuel nomic si tu es connecté dans un salon vocal personnalisé',
		),
	interaction: async (interaction, client) => {
		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		const voiceChannel = interaction.member.voice.channel

		// Si l'utilisateur n'est pas dans un salon vocal
		if (!voiceChannel)
			return interaction.editReply({
				content: 'Tu dois être dans un salon vocal pour utiliser cette commande 😕',
			})

		// Si l'utilisateur n'est pas dans un salon vocal personnalisé
		if (!client.voiceManager.has(voiceChannel.id))
			return interaction.editReply({
				content:
					'Tu dois être dans un salon vocal personnalisé pour utiliser cette commande 😕',
			})

		// Check s'il y a déjà un salon no-mic
		const existingNoMicChannel = client.voiceManager.get(voiceChannel.id)
		if (existingNoMicChannel)
			return interaction.editReply({
				content: `Il y a déjà un salon no-mic : ${existingNoMicChannel} 😕`,
			})

		// Crée le salon no mic
		const noMicChannel = await interaction.guild.channels.create({
			name: `No-mic ${voiceChannel.name}`,
			type: ChannelType.GuildText,
			topic: `Salon temporaire créé pour ${displayNameAndID(
				interaction.member,
				interaction.user,
			)}`,
			parent: voiceChannel.parent,
		})

		// Suppression des permissions existantes sauf
		// pour les rôles qui peuvent supprimer les messages (Modos)
		// ou qui ne peuvent pas envoyer de messages (Muted)
		await Promise.all(
			noMicChannel.permissionOverwrites.cache
				.filter(
					permissionOverwrites =>
						!(
							permissionOverwrites.allow.has('ManageMessages') ||
							permissionOverwrites.deny.has('SendMessages')
						),
				)
				.map(permission => permission.delete()),
		)

		// Setup des permissions
		await Promise.all([
			// Accès au salon pour les membres présents
			...voiceChannel.members.map(member =>
				noMicChannel.permissionOverwrites.edit(member, {
					CreateInstantInvite: false,
					ViewChannel: true,
					SendMessages: true,
					ReadMessageHistory: true,
				}),
			),
			// Setup les permissions (pas d'accès) pour le role @everyone
			noMicChannel.permissionOverwrites.edit(interaction.guild.id, {
				ViewChannel: false,
			}),
		])

		// Ajout du salon dans la map
		client.voiceManager.set(voiceChannel.id, noMicChannel)

		return interaction.editReply({
			content: `Ton salon a bien été créé : ${noMicChannel} 👌`,
		})
	},
}
