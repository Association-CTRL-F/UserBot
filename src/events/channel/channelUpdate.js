export default async (oldChannel, newChannel, client) => {
	// On ne garde que les salons vocaux / stage
	if (!oldChannel?.isVoiceBased() || !newChannel?.isVoiceBased()) return

	// Sécurité supplémentaire : on ne traite que le même salon mis à jour
	if (oldChannel.id !== newChannel.id) return

	// Si son nom n'a pas changé, return
	if (oldChannel.name === newChannel.name) return

	// Acquisition du salon no-mic, et return s'il n'y en a pas
	const noMicChannel = client.voiceManager.get(newChannel.id)
	if (!noMicChannel) return

	// Rename du salon no-mic avec le nouveau nom du vocal
	return noMicChannel.edit({ name: `No-mic ${newChannel.name}` }).catch(console.error)
}
