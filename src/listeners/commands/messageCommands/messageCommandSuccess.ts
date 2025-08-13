import { env } from '#app/env';
import { LOG_LEVELS } from '#lib/log_levels';
import { logSuccessCommand } from '#lib/utils';
import {
	Events,
	Listener,
	type MessageCommandSuccessPayload,
} from '@sapphire/framework';

export class UserEvent extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, {
			...options,
			event: Events.MessageCommandSuccess,
		});
	}

	public override run(payload: MessageCommandSuccessPayload) {
		logSuccessCommand(payload);
	}

	public override onLoad() {
		this.enabled = env.LOG_LEVEL === LOG_LEVELS.Debug;
		return super.onLoad();
	}
}
