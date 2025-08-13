import { env } from '#app/env';
import { LOG_LEVELS } from '#lib/log_levels';
import { logSuccessCommand } from '#lib/utils';
import {
	Events,
	Listener,
	type ContextMenuCommandSuccessPayload,
} from '@sapphire/framework';

export class UserListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, {
			...options,
			event: Events.ContextMenuCommandSuccess,
		});
	}

	public override run(payload: ContextMenuCommandSuccessPayload) {
		logSuccessCommand(payload);
	}

	public override onLoad() {
		this.enabled = env.LOG_LEVEL === LOG_LEVELS.Debug;
		return super.onLoad();
	}
}
