import { env } from '#app/setup';
import { LOG_LEVELS } from '#lib/log_levels';
import { CreateListenerLogger, getSuccessCommandText } from '#lib/logger';
import {
	Events,
	Listener,
	type ChatInputCommandSuccessPayload,
} from '@sapphire/framework';

export class UserListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, {
			...options,
			event: Events.ChatInputCommandSuccess,
		});
	}

	#logger = CreateListenerLogger('Chat Input Command Success');

	public override run(payload: ChatInputCommandSuccessPayload) {
		this.#logger.debug(getSuccessCommandText(payload));
	}

	public override onLoad() {
		this.enabled = env.LOG_LEVEL === LOG_LEVELS.Debug;
		return super.onLoad();
	}
}
