import { env } from '#app/setup';
import { TIME_UNITS } from '#lib/constants';
import { LOG_LEVELS, type LogLevel } from '#lib/log_levels';
import { container, LogLevel as SapphireLogLevel } from '@sapphire/framework';
import { GuildMFALevel } from 'discord.js';
import packageJson from '../../package.json' with { type: 'json' };

export function getDatabaseUrl() {
	return `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_DATABASE}`;
}

export async function closeGracefully(signal: string) {
	container.logger.info(`Received signal to terminate : ${signal}`);

	container.client?.destroy();
	container.logger.info('Discord client successfully destroyed');

	process.exit(0);
}

export function diffDate(
	date: Date | null,
	{
		excludeZeroUnits = false,
		defaultMessage = "Moins d'une minute",
	}: { excludeZeroUnits?: boolean; defaultMessage?: string } = {}
): string {
	if (!date) return defaultMessage;

	const now = new Date();
	let diff = Math.floor((now.getTime() - date.getTime()) / 1000);

	const parts: string[] = [];

	for (const unit of TIME_UNITS) {
		const value = Math.floor(diff / unit.seconds);
		if (excludeZeroUnits && value === 0) continue;
		parts.push(`${value} ${value > 1 ? unit.plural : unit.label}`);
		diff -= value * unit.seconds;
	}

	return parts.length > 0 ? parts.join(' ') : defaultMessage;
}

export function convertDateForDiscord(date: Date) {
	const unix = Math.floor(date.getTime() / 1000);
	return `<t:${unix}:F>`;
}

export function getDiscordjsVersion() {
	const discordjsVersion = packageJson.dependencies['discord.js'];
	return discordjsVersion.replace('^', '').replace('~', '').replace('>', '');
}

export function prettyNumber(number: number | string) {
	return Number(number).toLocaleString('fr-FR');
}

export function getMfaLevel(mfaLevel: GuildMFALevel) {
	return mfaLevel === GuildMFALevel.Elevated ? 'Activé' : 'Désactivé';
}

export function mapLogLevelToSapphireLogLevel(
	level: LogLevel
): SapphireLogLevel {
	switch (level) {
		case LOG_LEVELS.Trace:
			return SapphireLogLevel.Trace;
		case LOG_LEVELS.Debug:
			return SapphireLogLevel.Debug;
		case LOG_LEVELS.Info:
			return SapphireLogLevel.Info;
		case LOG_LEVELS.Warn:
			return SapphireLogLevel.Warn;
		case LOG_LEVELS.Error:
			return SapphireLogLevel.Error;
		case LOG_LEVELS.Fatal:
			return SapphireLogLevel.Fatal;
	}
}
