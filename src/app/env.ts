import { LOG_LEVELS } from '#lib/log_levels';
import 'dotenv/config';
import { cleanEnv, makeValidator, num, str } from 'envalid';

const discordTokenValidator = makeValidator((v: string) => {
	if (typeof v !== 'string' || v.length === 0) {
		throw new Error('Discord Token is required');
	}

	return v;
});

const requiredWhenProduction = (key: string) =>
	process.env.NODE_ENV === 'production' && !process.env[key];

export const env = cleanEnv(process.env, {
	/* Environment */
	NODE_ENV: str({ choices: ['development', 'production'] }),
	LOG_LEVEL: str({ choices: Object.values(LOG_LEVELS) }),

	/* Database */
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

	/* Discord */
	DISCORD_TOKEN: discordTokenValidator({ desc: 'Discord bot token' }),

	/* Affiliate */
	AFFILIATE_API_URL: str({
		desc: 'Affiliate API URL',
		default: 'https://api.ctrl-f.info/api/urls',
	}),
	AFFILIATE_API_KEY: str({
		desc: 'Affiliate API key',
	}),
});
