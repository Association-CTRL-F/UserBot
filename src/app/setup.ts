import * as colorette from 'colorette';
import 'dotenv/config';
import { cleanEnv, makeValidator, num, str } from 'envalid';

colorette.createColors({ useColor: true });

const discordTokenValidator = makeValidator((v: string) => {
	if (typeof v !== 'string' || v.length === 0) {
		throw new Error('Discord Token is required');
	}

	return v;
});

const requiredWhenProduction = (key: string) =>
	process.env.NODE_ENV === 'production' && !process.env[key];

export const env = cleanEnv(process.env, {
	NODE_ENV: str({ choices: ['development', 'production'] }),
	DB_DATABASE: str({
		desc: 'Database name',
		requiredWhen: () => requiredWhenProduction('DB_DATABASE'),
		default: 'app',
	}),
	DB_USER: str({
		desc: 'Database user',
		requiredWhen: () => requiredWhenProduction('DB_USER'),
		default: 'root',
	}),
	DB_PASSWORD: str({
		desc: 'Database password',
		requiredWhen: () => requiredWhenProduction('DB_PASSWORD'),
		default: 'root',
	}),
	DB_PORT: num({ desc: 'Database port', default: 5432 }),
	DB_HOST: str({ desc: 'Database host', default: 'localhost' }),
	DISCORD_TOKEN: discordTokenValidator({ desc: 'Discord bot token' }),
});
