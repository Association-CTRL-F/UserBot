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

export const TIME_UNITS = [
	{ label: 'an', seconds: 365 * 24 * 60 * 60, plural: 'ans' },
	{ label: 'mois', seconds: 30 * 24 * 60 * 60, plural: 'mois' },
	{ label: 'jour', seconds: 24 * 60 * 60, plural: 'jours' },
	{ label: 'heure', seconds: 60 * 60, plural: 'heures' },
	{ label: 'minute', seconds: 60, plural: 'minutes' },
] as const;

export const VERIFICATION_LEVEL_MAP = {
	0: 'Non spécifié',
	1: 'Faible : email vérifié requis',
	2: 'Moyen : sur Discord depuis 5 minutes',
	3: 'Élevé : sur le serveur depuis 10 minutes',
	4: 'Très élevé : numéro de téléphone vérifié',
} as const;

export const PREMIUM_TIER_MAP = {
	0: 'Aucun Boost',
	1: 'Niveau 1',
	2: 'Niveau 2',
	3: 'Niveau 3',
} as const;
