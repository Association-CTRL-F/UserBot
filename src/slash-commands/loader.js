import { readdir } from 'fs/promises'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { removeFileExtension } from '../util/util.js'

export default async client => {
	const clientId = client.user.id
	const guildId = client.config.guild.guildID
	const rest = new REST({ version: '9' }).setToken(client.token)

	// Dossier des commandes
	const commandsDir = (await readdir('./src/slash-commands')).filter(dir => !dir.endsWith('.js'))

	const commands = (
		await Promise.all(
			commandsDir.map(async commandCategory => {
				const commandFiles = await readdir(`./src/slash-commands/${commandCategory}`)

				// Ajout dans la map utilisée pour la commande "rôles"
				client.commandsCategories.set(
					commandCategory,
					commandFiles.map(removeFileExtension),
				)

				return Promise.all(
					commandFiles.map(async commandFile => {
						const command = (
							await import(`../slash-commands/${commandCategory}/${commandFile}`)
						).default

						client.commands.set(command.data.name, command)
						return command.data.toJSON()
					}),
				)
			}),
		)
	).flat()

	try {
		await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: commands,
		})
		console.log('Slash commands ✅')
	} catch (error) {
		console.log('Slash commands ❌')
	}
}
