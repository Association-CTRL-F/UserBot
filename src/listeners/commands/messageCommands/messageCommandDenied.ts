import {
	Events,
	Listener,
	type MessageCommandDeniedPayload,
	type UserError,
} from '@sapphire/framework';

export class UserEvent extends Listener<typeof Events.MessageCommandDenied> {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, {
			...options,
			event: Events.MessageCommandDenied,
		});
	}

	public override async run(
		{ context, message: content }: UserError,
		{ message }: MessageCommandDeniedPayload
	) {
		if (Reflect.get(Object(context), 'silent')) return;

		return message.reply({
			content,
			allowedMentions: { users: [message.author.id], roles: [] },
		});
	}
}
