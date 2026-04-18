import { readdir } from 'node:fs/promises'
import { REST, Routes } from 'discord.js'
import { removeFileExtension } from '../util/util.js'

export default async (client) => {
	const clientId = client.user?.id
	if (!clientId) {
		console.error("Impossible d'enregistrer les commandes : client.user.id introuvable")
		return
	}

	const rest = new REST({ version: '10' }).setToken(client.token)

	// Dossier des commandes
	const commandsDir = (await readdir('./src/slash-commands')).filter(
		(dir) => !dir.endsWith('.js'),
	)

	const commandsNested = await Promise.all(
		commandsDir.map(async (commandCategory) => {
			const commandFiles = (await readdir(`./src/slash-commands/${commandCategory}`)).filter(
				(file) => file.endsWith('.js'),
			)

			// Ajout dans la map
			client.commandsCategories.set(commandCategory, commandFiles.map(removeFileExtension))

			return Promise.all(
				commandFiles.map(async (commandFile) => {
					const command = (
						await import(`../slash-commands/${commandCategory}/${commandFile}`)
					).default

					const datas = []

					if (command.data) {
						client.commands.set(command.data.name, command)
						datas.push(command.data.toJSON())
					}

					if (command.contextMenu) {
						client.contextmenus.set(command.contextMenu.name, command)
						datas.push(command.contextMenu.toJSON())
					}

					return datas
				}),
			)
		}),
	)

	const commands = commandsNested.flat(2)

	try {
		await rest.put(Routes.applicationCommands(clientId), {
			body: commands,
		})

		console.log(`Slash commands ✅ (${commands.length} enregistrées)`)
	} catch (error) {
		console.log('Slash commands ❌')
		console.error(error)
	}
}
