import { DB_CONFIG } from '#lib/constants';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types.js';

export const db = new Kysely<Database>({
	dialect: new PostgresDialect({
		pool: new Pool(DB_CONFIG),
	}),
});
