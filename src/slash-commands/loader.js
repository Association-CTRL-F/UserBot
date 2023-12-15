import { readdir } from 'fs/promises'
import { REST, Routes } from 'discord.js'
import { removeFileExtension } from '../util/util.js'

export default async client => {
	const clientId = client.user.id
	const rest = new REST().setToken(client.token)

	// Dossier des commandes
	const commandsDir = (await readdir('./src/slash-commands')).filter(dir => !dir.endsWith('.js'))

	const commands = (
		await Promise.all(
			commandsDir.map(async commandCategory => {
				const commandFiles = await readdir(`./src/slash-commands/${commandCategory}`)

				// Ajout dans la map
				client.commandsCategories.set(
					commandCategory,
					commandFiles.map(removeFileExtension),
				)

				return Promise.all(
					commandFiles.map(async commandFile => {
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
	).flat(2)

	try {
		await rest.put(Routes.applicationCommands(clientId), {
			body: commands,
		})
		console.log('Slash commands ✅')
	} catch (error) {
		console.log('Slash commands ❌')
	}
}
