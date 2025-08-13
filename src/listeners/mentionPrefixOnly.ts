import { Events, Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

export class UserEvent extends Listener<typeof Events.MentionPrefixOnly> {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, {
			...options,
			event: Events.MentionPrefixOnly,
		});
	}

	public override run(message: Message) {
		if (!message.channel.isSendable()) return;

		const prefix = this.container.client.options.defaultPrefix;
		return message.channel.send(
			prefix
				? `Mon prefix dans ce serveur est : \`${prefix}\``
				: "Je n'ai pas de préfixe pour les messages"
		);
	}
}
