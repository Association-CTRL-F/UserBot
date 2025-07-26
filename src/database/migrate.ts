import { DB_CONFIG } from '#lib/constants';
import { promises as fs } from 'fs';
import {
	FileMigrationProvider,
	Kysely,
	Migrator,
	PostgresDialect,
} from 'kysely';
import * as path from 'path';
import { Pool } from 'pg';
import type { Database } from './types.js';

async function migrateToLatest() {
	const db = new Kysely<Database>({
		dialect: new PostgresDialect({
			pool: new Pool(DB_CONFIG),
		}),
	});

	const migrator = new Migrator({
		db,
		provider: new FileMigrationProvider({
			fs,
			path,
			migrationFolder: path.join(process.cwd(), 'src/database/migrations'),
		}),
	});

	const { error, results } = await migrator.migrateToLatest();

	results?.forEach((it) => {
		if (it.status === 'Success') {
			console.log(`✅ Migration "${it.migrationName}" executed successfully`);
		} else if (it.status === 'Error') {
			console.error(`❌ Failed to execute migration "${it.migrationName}"`);
		}
	});

	if (error) {
		console.error('❌ Failed to migrate');
		console.error(error);
		process.exit(1);
	}

	await db.destroy();
}

if (import.meta.url === `file://${process.argv[1]}`) {
	migrateToLatest()
		.then(() => {
			console.log('✅ Migrations completed successfully');
			process.exit(0);
		})
		.catch((error) => {
			console.error('❌ Migration failed:', error);
			process.exit(1);
		});
}

export { migrateToLatest };
