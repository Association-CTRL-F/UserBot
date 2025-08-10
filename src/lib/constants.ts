import { getDatabaseUrl } from '#lib/utils';
import { type PoolConfig } from 'pg';

export const DEFAULT_LOCALE = 'fr';
export const DB_CONFIG: PoolConfig = {
	connectionString: getDatabaseUrl(),
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
};

export const COLORS = {
	DEFAULT: '#3366FF',
} as const;

// TODO: i18n this
export const TIME_UNITS = [
	{ label: 'an', seconds: 365 * 24 * 60 * 60, plural: 'ans' },
	{ label: 'mois', seconds: 30 * 24 * 60 * 60, plural: 'mois' },
	{ label: 'jour', seconds: 24 * 60 * 60, plural: 'jours' },
	{ label: 'heure', seconds: 60 * 60, plural: 'heures' },
	{ label: 'minute', seconds: 60, plural: 'minutes' },
] as const;
