import { env } from '#app/setup';
import { closeGracefully } from '#lib/utils';
import {
	ApplicationCommandRegistries,
	RegisterBehavior,
	SapphireClient,
} from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';

import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-subcommands/register';

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

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

void main();
