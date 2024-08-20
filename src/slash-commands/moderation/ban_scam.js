import {
	EmbedBuilder,
	ContextMenuCommandBuilder,
	RESTJSONErrorCodes,
	GuildBan,
	User,
} from 'discord.js'
import { convertDateForDiscord, diffDate } from '../../util/util.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('ban_scam').setType(2),
	interaction: async (interaction, client) => {
		if (!interaction.commandType === 2) return

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Acquisition du membre
		const member = interaction.guild.members.cache.get(interaction.targetUser.id)
		if (!member)
			return interaction.editReply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			})

		// On ne peut pas se ban soi-même
		if (member.user === interaction.user)
			return interaction.editReply({
				content: 'Tu ne peux pas te bannir toi-même 😕',
			})

		// Vérification si le ban existe déjà
		const ban = await interaction.guild.bans.fetch(member.user).catch(() => false)
		if (ban instanceof GuildBan)
			return interaction.editReply({
				content: 'Cet utilisateur est déjà banni 😕',
				ephemeral: true,
			})

		// Acquisition de la base de données Moderation
		const bddModeration = client.config.db.pools.moderation
		if (!bddModeration)
			return interaction.editReply({
				content:
					'Une erreur est survenue lors de la connexion à la base de données Moderation 😕',
				ephemeral: true,
			})

		// Acquisition du salon de logs
		const logsChannel = interaction.guild.channels.cache.get(
			client.config.guild.channels.LOGS_BANS_CHANNEL_ID,
		)
		if (!logsChannel) return

		// Envoi du message de bannissement en message privé
		let errorDM = ''

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Scam')
			.setDescription(
				`**Vous êtes à présent banni du serveur**
				Votre compte semble avoir été compromis. Pour votre sécurité, nous vous conseillons de changer vos mots de passe.
				Si vous estimez que cette sanction est illégitime, vous pouvez effectuer une demande de levée de bannissement que nous étudierons à l'adresse https://moderation.ctrl-f.info`,
			)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			})

		let DMMessage = false
		if (member)
			DMMessage = await member
				.send({
					embeds: [embed],
				})
				.catch(error => {
					console.error(error)
					errorDM =
						"\n\nℹ️ Le message privé n'a pas été envoyé car l'utilisateur les a bloqué"
				})

		// Ban du membre
		const banAction = await interaction.guild.members
			.ban(member.user, {
				deleteMessageSeconds: 86400,
				reason: `${interaction.user.tag} : compte compromis`,
			})
			.catch(error => {
				// Suppression du message privé envoyé
				// car action de bannissement non réalisée
				if (DMMessage) DMMessage.delete()

				if (error.code === RESTJSONErrorCodes.UnknownUser)
					return interaction.editReply({
						content: "Tu n'as pas donné un ID d'utilisateur 😬",
						ephemeral: true,
					})

				if (error.code === RESTJSONErrorCodes.MissingPermissions)
					return interaction.editReply({
						content: "Tu n'as pas les permissions pour bannir ce membre 😬",
						ephemeral: true,
					})

				console.error(error)
				return interaction.editReply({
					content: 'Une erreur est survenue lors du bannissement du membre 😬',
					ephemeral: true,
				})
			})

		// Si pas d'erreur, message de confirmation du bannissement
		if (banAction instanceof User) {
			await interaction.editReply({
				content: `🔨 \`${member.user.tag}\` a été banni définitivement\n\nRaison : compte compromis${errorDM}`,
			})

			// Création de l'embed
			const logEmbed = new EmbedBuilder()
				.setColor('C9572A')
				.setAuthor({
					name: `${member.user.tag} (ID : ${member.user.id})`,
					iconURL: banAction.displayAvatarURL({ dynamic: true }),
				})
				.setDescription(`\`\`\`\n${interaction.user.tag} : compte compromis\`\`\``)
				.addFields([
					{
						name: 'Mention',
						value: banAction.toString(),
						inline: true,
					},
					{
						name: 'Date de création du compte',
						value: convertDateForDiscord(banAction.createdAt),
						inline: true,
					},
					{
						name: 'Âge du compte',
						value: diffDate(banAction.createdAt),
						inline: true,
					},
				])
				.setFooter({
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
					text: `Membre banni par ${interaction.user.tag}`,
				})
				.setTimestamp(new Date())

			// Insertion du nouveau ban en base de données
			try {
				const sql =
					'INSERT INTO bans_logs (discord_id, username, avatar, executor_id, executor_username, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
				const data = [
					member.user.id,
					member.user.username,
					member.user.avatar ? member.user.avatar : null,
					interaction.user.id,
					interaction.user.username,
					'compte compromis',
					Math.round(Date.now() / 1000),
				]

				await bddModeration.execute(sql, data)
			} catch (error) {
				console.error(error)
				return interaction.editReply({
					content: 'Une erreur est survenue lors du ban du membre en base de données 😬',
				})
			}

			return logsChannel.send({ embeds: [logEmbed] })
		}

		// Si au moins une erreur, throw
		if (banAction instanceof Error || DMMessage instanceof Error)
			throw new Error(
				"L'envoi d'un message et / ou le bannissement d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
			)
	},
}
