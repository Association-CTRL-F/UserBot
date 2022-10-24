import { isGuildSetup } from '../../util/util.js'
import { EmbedBuilder, ContextMenuCommandBuilder, RESTJSONErrorCodes } from 'discord.js'

export default {
	contextMenu: new ContextMenuCommandBuilder().setName('hors_sujet').setType(3),
	interaction: async (interaction, client) => {
		if (!interaction.commandType === 3) return

		// On diffère la réponse pour avoir plus de 3 secondes
		await interaction.deferReply({ ephemeral: true })

		// Vérification que la guild soit entièrement setup
		const isSetup = await isGuildSetup(interaction.guild, client)

		if (!isSetup)
			return interaction.editReply({
				content: "Le serveur n'est pas entièrement configuré 😕",
			})

		const message = interaction.targetMessage

		if (message.author.bot || !message.guild)
			return interaction.editReply({
				content: "Tu ne peux pas déclarer hors-sujet le message d'un bot 😕",
			})

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd)
			return interaction.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Acquisition des paramètres de la guild
		let configGuild = {}
		try {
			const sqlSelect = 'SELECT * FROM config WHERE GUILD_ID = ?'
			const dataSelect = [interaction.guild.id]
			const [resultSelect] = await bdd.execute(sqlSelect, dataSelect)
			configGuild = resultSelect[0]
		} catch (error) {
			return console.log(error)
		}

		// On ne peut pas définir hors-sujet son propre message
		if (message.author === interaction.user)
			return interaction.editReply({
				content: 'Tu ne peux pas définir hors-sujet ton propre message 😕',
			})

		const member = interaction.guild.members.cache.get(message.author.id)
		if (!member)
			return interaction.editReply({
				content:
					"Je n'ai pas trouvé cet utilisateur, il n'est sans doute plus présent sur le serveur 😕",
				ephemeral: true,
			})

		let description = `Ton message est hors-sujet, merci de veiller à bien respecter les salons du serveur.\n\n• Il n'y a pas d'entraide dans le salon <#${configGuild.BLABLA_CHANNEL_ID}>.\n• Si tu ne trouves pas le bon salon, tu peux te référer au salon <#${configGuild.ACCESS_CHANNEL_ID}> afin de choisir tes différents accès.`

		if (member.roles.cache.has(configGuild.NO_ENTRAIDE_ROLE_ID))
			description = description.concat(
				'\n',
				`• Tu as coché la case du rôle "Pas d'entraide" en ayant mal lu ce que la description indiquait, tu peux te référer au bas du salon <#${configGuild.ACCESS_CHANNEL_ID}> afin de retirer la réaction.`,
			)

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Hors-sujet')
			.setDescription(description)
			.setAuthor({
				name: interaction.guild.name,
				iconURL: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			})
			.addFields([
				{
					name: 'Message posté',
					value: `\`\`\`${
						message.content.length < 1024
							? message.content
							: `${message.content.substr(0, 1012)} [...]`
					}\`\`\``,
				},
			])

		try {
			await member.send({
				embeds: [embed],
			})
		} catch (error) {
			if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) throw error

			return interaction.editReply({
				content:
					"Hors-sujet non déclaré 😬\nL'utilisateur m'a sûrement bloqué / désactivé les messages provenant du serveur",
				ephemeral: true,
			})
		}

		await message.delete()

		return interaction.editReply({
			content: 'Hors-sujet déclaré 👌',
		})
	},
}
