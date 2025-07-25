import * as colorette from 'colorette';
import 'dotenv/config';
import { cleanEnv, makeValidator, str } from 'envalid';

colorette.createColors({ useColor: true });

const discordTokenValidator = makeValidator((v: string) => {
	if (typeof v !== 'string' || v.length === 0) {
		throw new Error('Discord Token is required');
	}

	return v;
});

export const env = cleanEnv(process.env, {
	NODE_ENV: str({ choices: ['development', 'production'] }),
	DISCORD_TOKEN: discordTokenValidator({ desc: 'Discord bot token' }),
});
