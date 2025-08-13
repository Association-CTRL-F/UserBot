import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { MessageFlags } from 'discord.js';

export class PingCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: 'ping',
			aliases: ['pong'],
			description: "Donne le ping de l'API et du bot",
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description)
		);
	}

	public async messageRun(message: Message) {
		const msg = await message.reply('Pong !');
		const latency = msg.createdTimestamp - message.createdTimestamp;
		const ping = Math.round(this.container.client.ws.ping);
		return msg.edit(
			`Pong ! (Modification d'un message: ${latency}ms. Heartbeat: ${ping}ms.)`
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction
	) {
		const callbackResponse = await interaction.reply({
			content: 'Pong !',
			withResponse: true,
			flags: MessageFlags.Ephemeral,
		});
		const msg = callbackResponse.resource?.message;

		if (msg && isMessageInstance(msg)) {
			const latency = msg.createdTimestamp - interaction.createdTimestamp;
			const ping = Math.round(this.container.client.ws.ping);
			return interaction.editReply(
				`Pong ! (Modification d'un message: ${latency}ms. Heartbeat: ${ping}ms.)`
			);
		}

		return interaction.editReply('Failed to retrieve ping :(');
	}
}
