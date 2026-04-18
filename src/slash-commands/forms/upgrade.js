import {
	SlashCommandBuilder,
	ContextMenuCommandBuilder,
	EmbedBuilder,
	RESTJSONErrorCodes,
	ApplicationCommandType,
	MessageFlags
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('upgrade')
		.setDescription("Donne le formulaire d'upgrade")
		.addUserOption((option) => option.setName('membre').setDescription('Membre')),

	contextMenu: new ContextMenuCommandBuilder()
		.setName('upgrade')
		.setType(ApplicationCommandType.User),

	interaction: async (interaction, client) => {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		if (!interaction.guild?.available) {
			return interaction.editReply({
				content: 'La guilde est indisponible pour le moment 😕',
			})
		}

		// Acquisition de l'utilisateur ciblé
		const user =
			interaction.commandType === ApplicationCommandType.User
				? interaction.targetUser
				: (interaction.options.getUser('membre') ?? interaction.user)

		if (!user) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur 😕",
			})
		}

		// Acquisition du membre
		const member = await interaction.guild.members.fetch(user.id).catch(() => null)
		if (!member) {
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})
		}

		const cooldownKey = `upgrade-${member.user.id}`

		if (client.cache.conseilsUsersID.has(cooldownKey)) {
			if (member.user.id === interaction.user.id) {
				return interaction.editReply({
					content:
						"Merci de patienter quelques instants avant d'effectuer à nouveau la commande 😕",
				})
			}

			return interaction.editReply({
				content:
					"Merci de patienter quelques instants avant d'envoyer un nouveau formulaire à cette personne 😕",
			})
		}

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		// Acquisition du formulaire
		let upgrade = ''
		let upgradeDescription = ''

		try {
			const [[upgradeResult], [upgradeDescResult]] = await Promise.all([
				bdd.execute('SELECT * FROM forms WHERE name = ?', ['upgrade']),
				bdd.execute('SELECT * FROM forms WHERE name = ?', ['upgradeDescription']),
			])

			upgrade = upgradeResult?.[0]?.content ?? ''
			upgradeDescription = upgradeDescResult?.[0]?.content ?? ''
		} catch (error) {
			console.error(error)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la récupération du formulaire en base de données 😬',
			})
		}

		if (!upgrade) {
			return interaction.editReply({
				content: "Le formulaire d'upgrade est introuvable ou vide 😕",
			})
		}

		// Acquisition du salon
		const upgradeChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.UPGRADE_CHANNEL_ID,
		)

		// Création de l'embed
		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle("Formulaire d'upgrade")
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
				url: interaction.guild.vanityURL ?? undefined,
			})
			.setFields(
				...(upgradeChannel
					? [
							{
								name: 'Salon dans lequel renvoyer le formulaire complété',
								value: upgradeChannel.toString(),
							},
						]
					: []),
				{
					name: 'Précisions',
					value: upgradeDescription || 'Aucune précision fournie.',
				},
			)

		// Envoi du formulaire en DM
		try {
			await member.send({ embeds: [embed] })
			await member.send(upgrade)

			client.cache.conseilsUsersID.add(cooldownKey)

			globalThis.setTimeout(() => {
				client.cache.conseilsUsersID.delete(cooldownKey)
			}, 60_000)
		} catch (error) {
			if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
				if (member.user.id === interaction.user.id) {
					return interaction.editReply({
						content:
							"Je n'ai pas réussi à envoyer le message privé, tu m'as sûrement bloqué / désactivé tes messages provenant du serveur 😬",
					})
				}

				return interaction.editReply({
					content:
						"Je n'ai pas réussi à envoyer le DM, l'utilisateur mentionné m'a sûrement bloqué / désactivé les messages provenant du serveur 😬",
				})
			}

			console.error(error)
			return interaction.editReply({
				content: "Une erreur est survenue lors de l'envoi du formulaire 😬",
			})
		}

		if (member.user.id === interaction.user.id) {
			return interaction.editReply({
				content:
					"Formulaire envoyé en message privé 👌\n\n⚠️ Si quelqu'un te MP suite à ta demande, **c'est une arnaque**, ne répond pas et contacte immédiatement un modérateur ⚠️",
			})
		}

		if (upgradeChannel) {
			return interaction.editReply({
				content: `${member}, remplis le formulaire reçu en message privé puis poste le dans ${upgradeChannel} 👌\n\n⚠️ Si quelqu'un te MP suite à ta demande, **c'est une arnaque**, ne répond pas et contacte immédiatement un modérateur ⚠️`,
			})
		}

		return interaction.editReply({
			content: `${member}, remplis le formulaire reçu en message privé 👌\n\n⚠️ Si quelqu'un te MP suite à ta demande, **c'est une arnaque**, ne répond pas et contacte immédiatement un modérateur ⚠️`,
		})
	},
}
