import {
	Events,
	Listener,
	UserError,
	type ContextMenuCommandDeniedPayload,
} from '@sapphire/framework';

export class UserEvent extends Listener<
	typeof Events.ContextMenuCommandDenied
> {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, {
			...options,
			event: Events.ContextMenuCommandDenied,
		});
	}

	public override async run(
		{ context, message: content }: UserError,
		{ interaction }: ContextMenuCommandDeniedPayload
	) {
		if (Reflect.get(Object(context), 'silent')) return;

		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				content,
				allowedMentions: { users: [interaction.user.id], roles: [] },
			});
		}

		return interaction.reply({
			content,
			allowedMentions: { users: [interaction.user.id], roles: [] },
			ephemeral: true,
		});
	}
}
