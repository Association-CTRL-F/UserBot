import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js'

export default {
	data: {
		name: 'command-edit',
	},
	interaction: async (modal, client) => {
		await modal.deferReply({ flags: MessageFlags.Ephemeral })

		// Acquisition du nom, des alias et du contenu
		const nom = modal.fields.getTextInputValue('name-command-edit').trim().toLowerCase()

		const aliasesRaw = modal.fields
			.getTextInputValue('aliases-command-edit')
			.trim()
			.toLowerCase()

		const active = modal.fields.getTextInputValue('active-command-edit').trim()
		const contenu = modal.fields.getTextInputValue('content-command-edit').trim()
		const buttonRaw = modal.fields.getTextInputValue('button-command-edit').trim()

		const aliasesList = aliasesRaw
			? aliasesRaw
					.split(/[,\s]+/)
					.map((alias) => alias.trim())
					.filter(Boolean)
			: []

		const aliases = aliasesList.length ? aliasesList.join(',') : null

		let textLinkButton = null
		let linkButton = null

		if (buttonRaw) {
			const buttonInfos = buttonRaw.split('|||').map((value) => value.trim())

			if (buttonInfos.length < 2 || !buttonInfos[0] || !buttonInfos[1]) {
				return modal.editReply({
					content: 'Le champ bouton doit être au format `Texte|||Lien` 😕',
				})
			}

			try {
				const parsedUrl = new URL(buttonInfos[1])
				if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
					throw new Error('Invalid protocol')
				}
			} catch {
				return modal.editReply({
					content: 'Le lien du bouton n’est pas valide 😕',
				})
			}

			textLinkButton = buttonInfos[0]
			linkButton = buttonInfos[1]
		}

		// Acquisition de la base de données
		const bdd = client.config.db.pools.userbot
		if (!bdd) {
			return modal.editReply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
			})
		}

		const regexCommand = /^[a-zA-Z0-9]+$/
		if (!regexCommand.test(nom)) {
			return modal.editReply({
				content: "Le nom de commande n'est pas valide (alphanumérique uniquement) 😕",
			})
		}

		if (aliasesList.some((alias) => !regexCommand.test(alias))) {
			return modal.editReply({
				content:
					'Un ou plusieurs alias ne sont pas valides (alphanumériques uniquement) 😕',
			})
		}

		if (active !== '0' && active !== '1') {
			return modal.editReply({
				content: 'Le champ activation doit être défini sur 0 ou 1 😕',
			})
		}

		// Vérification si la commande existe
		let command = null
		try {
			const sql = 'SELECT * FROM commands WHERE name = ?'
			const data = [nom]
			const [result] = await bdd.execute(sql, data)
			command = result[0] ?? null
		} catch (error) {
			console.error(error)
			return modal.editReply({
				content: 'Une erreur est survenue lors de la vérification du nom de la commande 😕',
			})
		}

		// Vérification que la commande existe bien
		if (!command) {
			return modal.editReply({
				content: `La commande **${nom}** n'existe pas 😕`,
			})
		}

		// Vérification des conflits d'alias avec les autres commandes
		if (aliasesList.length) {
			try {
				const sql = 'SELECT name, aliases FROM commands WHERE name <> ?'
				const data = [nom]
				const [result] = await bdd.execute(sql, data)

				const conflict = result.find((existingCommand) => {
					const existingAliases = existingCommand.aliases
						? existingCommand.aliases.split(',').map((alias) => alias.trim())
						: []

					return (
						aliasesList.includes(existingCommand.name) ||
						existingAliases.some((alias) => aliasesList.includes(alias))
					)
				})

				if (conflict) {
					return modal.editReply({
						content: 'Un des alias existe déjà comme commande ou alias 😕',
					})
				}
			} catch (error) {
				console.error(error)
				return modal.editReply({
					content: 'Une erreur est survenue lors de la vérification des alias 😕',
				})
			}
		}

		// Mise à jour de la commande en base de données
		try {
			const sql =
				'UPDATE commands SET aliases = ?, active = ?, content = ?, textLinkButton = ?, linkButton = ?, lastModificationBy = ?, lastModificationAt = ? WHERE name = ?'
			const data = [
				aliases,
				Number(active),
				contenu,
				textLinkButton,
				linkButton,
				modal.user.id,
				Math.round(Date.now() / 1000),
				nom,
			]

			await bdd.execute(sql, data)
		} catch (error) {
			console.error(error)
			return modal.editReply({
				content:
					'Une erreur est survenue lors de la modification de la commande en base de données 😕',
			})
		}

		// Préparation éventuelle du bouton
		let button = null
		if (textLinkButton && linkButton) {
			button = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel(textLinkButton)
					.setURL(linkButton)
					.setStyle(ButtonStyle.Link),
			)
		}

		const statusText = active === '1' ? '**activée**' : '**désactivée**'
		const preview = `La commande **${nom}** a bien été modifiée et est ${statusText} 👌${
			aliases ? `\n\n__Alias :__\n\`\`\`${aliases}\`\`\`` : ''
		}\n__Prévisualisation :__\n\n${contenu}`

		if (!button) {
			return modal.editReply({
				content: preview,
			})
		}

		return modal.editReply({
			content: preview,
			components: [button],
		})
	},
}
