import { getDiscordjsVersion } from '#lib/utils';
import packageJson from '../../package.json' with { type: 'json' };

export const app = {
	botVersion: packageJson.version,
	discordjsVersion: getDiscordjsVersion(),
	richPresence: {
		description: "Optimiser l'effet placebo",
	},
};
