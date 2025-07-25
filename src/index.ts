import { env } from '#app/env';
import {
	ApplicationCommandRegistries,
	RegisterBehavior,
	SapphireClient,
} from '@sapphire/framework';
import type { InternationalizationContext } from '@sapphire/plugin-i18next';
import { GatewayIntentBits, Partials } from 'discord.js';

import '@sapphire/plugin-hmr/register';
import '@sapphire/plugin-i18next/register';
import '@sapphire/plugin-logger/register';

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
	RegisterBehavior.BulkOverwrite
);

const DEFAULT_LOCALE = 'fr-FR';

const client = new SapphireClient({
	intents: [
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	],
	loadMessageCommandListeners: true,
	defaultPrefix: '!',
	caseInsensitiveCommands: true,
	shards: 'auto',
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
	hmr: {
		enabled: env.isDev,
	},
	i18n: {
		fetchLanguage: (context: InternationalizationContext) => {
			const language =
				context.interactionGuildLocale ??
				context.interactionLocale ??
				DEFAULT_LOCALE;
			return language;
		},
	},
});

const main = async () => {
	try {
		await client.login(env.DISCORD_TOKEN);
		client.logger.info(
			`Logged in as ${client.user?.username} (${client.user?.id})`
		);
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();
