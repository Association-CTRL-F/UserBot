import { PermissionsBitField, ChannelType } from 'discord.js'

const handleLeave = async (oldState, client) => {
	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return
	}

	// S'il quitte un salon non personnalisé, on return
	if (!client.voiceManager.has(oldState.channelId)) return

	const oldChannel = oldState.channel
	if (!oldChannel?.isVoiceBased()) return

	// S'il quitte et que le salon est vide
	if (oldChannel.members.size === 0) {
		// Acquisition du salon no-mic
		const noMicChannel = client.voiceManager.get(oldState.channelId)

		// S'il existe, on supprime le salon no-mic
		if (noMicChannel) {
			await noMicChannel.delete().catch(() => null)
		}

		// On supprime le salon de la map
		client.voiceManager.delete(oldState.channelId)

		try {
			const sql = 'DELETE FROM vocal WHERE channelId = ?'
			const data = [oldChannel.id]
			await bdd.execute(sql, data)
		} catch (error) {
			console.log(
				'Une erreur est survenue lors de la suppression du salon vocal en base de données',
			)
			console.error(error)
		}

		// Suppression du salon vocal
		return oldChannel.delete().catch(() => null)
	}

	// S'il n'est pas vide et qu'il quitte un salon avec un no-mic
	const noMicChannel = client.voiceManager.get(oldState.channelId)
	if (noMicChannel) {
		// Suppression des permissions du membre pour le salon no-mic
		return noMicChannel.permissionOverwrites.delete(oldState.id).catch(() => null)
	}
}

const handleJoin = async (newState) => {
	// Acquisition de la base de données
	const bdd = newState.client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return
	}

	const member = newState.member
	const client = newState.client

	// S'il rejoint un salon qui doit créer un nouveau salon
	const VOICE = client.config.guild.managers.VOICE_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.VOICE_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (VOICE.includes(newState.channelId)) {
		// Création du salon vocal
		const createdChannel = await newState.guild.channels
			.create({
				name: `Vocal de ${member.displayName}`,
				type: ChannelType.GuildVoice,
				parent: newState.channel.parent ?? undefined,
			})
			.catch((error) => {
				console.error(error)
				return null
			})

		if (!createdChannel) return

		// Donne les permissions de gestion au propriétaire du vocal
		await createdChannel.permissionOverwrites
			.edit(member.id, {
				ViewChannel: true,
				Connect: true,
				ManageChannels: true,
				MoveMembers: true,
			})
			.catch(console.error)

		// Déplacement du membre dans son nouveau salon vocal
		const moveAction = await member.voice.setChannel(createdChannel).catch(() => null)

		// Si l'utilisateur ne peut pas être move dans le salon créé,
		// on supprime le salon créé
		if (!moveAction) {
			await createdChannel.delete().catch(() => null)
			return
		}

		try {
			const sql = 'INSERT INTO vocal (channelId) VALUES (?)'
			const data = [createdChannel.id]
			await bdd.execute(sql, data)
		} catch (error) {
			console.log(
				'Une erreur est survenue lors de la création du salon vocal en base de données',
			)
			console.error(error)
		}

		// Ajout de l'id du salon vocal perso dans la liste
		client.voiceManager.set(createdChannel.id, null)
		return
	}

	// S'il rejoint un salon perso qui a un no-mic
	const noMicChannel = client.voiceManager.get(newState.channelId)
	if (noMicChannel) {
		// On lui donne la permission de voir le salon
		return noMicChannel.permissionOverwrites
			.edit(newState.id, {
				ViewChannel: true,
				SendMessages: true,
				ReadMessageHistory: true,
				CreateInstantInvite: false,
			})
			.catch(console.error)
	}
}

export default async (oldState, newState, client) => {
	// Pour uniquement garder les changements de salon et non d'état
	if (oldState.channelId === newState.channelId) return

	// Si l'utilisateur quitte un salon
	if (oldState.channel) {
		await handleLeave(oldState, client)
	}

	// Si l'utilisateur rejoint un salon
	if (newState.channel) {
		await handleJoin(newState)
	}
}
