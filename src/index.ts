import { env } from '#app/env';
import {
	ApplicationCommandRegistries,
	RegisterBehavior,
	SapphireClient,
} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import { GatewayIntentBits, Partials } from 'discord.js';

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
	RegisterBehavior.BulkOverwrite
);

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
});

const main = async () => {
	try {
		client.logger.info('Logging in');
		await client.login(env.DISCORD_TOKEN);
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();
