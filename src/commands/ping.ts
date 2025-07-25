import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { MessageFlags } from 'discord.js';

export class PingCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: 'ping',
			description: 'Ping bot to see if it is alive',
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName('ping').setDescription('Ping bot to see if it is alive')
		);
	}

	public async messageRun(message: Message) {
		const msg = await message.reply('Ping?');
		const diff = msg.createdTimestamp - message.createdTimestamp;
		const ping = Math.round(this.container.client.ws.ping);
		return msg.edit(
			`Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction
	) {
		const callbackResponse = await interaction.reply({
			content: `Ping?`,
			withResponse: true,
			flags: MessageFlags.Ephemeral,
		});
		const msg = callbackResponse.resource?.message;

		if (msg && isMessageInstance(msg)) {
			const diff = msg.createdTimestamp - interaction.createdTimestamp;
			const ping = Math.round(this.container.client.ws.ping);
			return interaction.editReply(
				`Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`
			);
		}

		return interaction.editReply('Failed to retrieve ping :(');
	}
}
