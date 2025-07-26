import { getDatabaseUrl } from '#lib/utils';
import { PoolConfig } from 'pg';

export const DEFAULT_LOCALE = 'fr';
export const DB_CONFIG: PoolConfig = {
	connectionString: getDatabaseUrl(),
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
};
