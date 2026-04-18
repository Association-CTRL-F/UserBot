export default (channel, client) => {
	if (channel?.isVoiceBased()) {
		client.voiceManager.delete(channel.id)
	}
}
