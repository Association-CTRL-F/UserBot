import { DB_CONFIG } from '#lib/constants';
import { PostgresDialect } from 'kysely';
import { defineConfig } from 'kysely-ctl';
import { Pool } from 'pg';

export default defineConfig({
	destroyOnExit: true,
	dialect: new PostgresDialect({
		pool: new Pool(DB_CONFIG),
	}),
	migrations: {
		migrationFolder: './src/database/migrations',
		allowJS: false,
	},
	seeds: {
		seedFolder: './src/database/seeds',
		allowJS: false,
	},
});
