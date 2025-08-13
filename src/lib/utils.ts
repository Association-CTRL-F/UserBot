import { env } from '#app/setup';
import { TIME_UNITS } from '#lib/constants';
import {
	container,
	type ChatInputCommandSuccessPayload,
	type Command,
	type ContextMenuCommandSuccessPayload,
	type MessageCommandSuccessPayload,
} from '@sapphire/framework';
import { cyan } from 'colorette';
import type { APIUser, Guild, User } from 'discord.js';
import { GuildMFALevel } from 'discord.js';
import packageJson from '../../package.json' with { type: 'json' };

export function logSuccessCommand(
	payload:
		| ContextMenuCommandSuccessPayload
		| ChatInputCommandSuccessPayload
		| MessageCommandSuccessPayload
): void {
	let successLoggerData: ReturnType<typeof getSuccessLoggerData>;

	if ('interaction' in payload) {
		successLoggerData = getSuccessLoggerData(
			payload.interaction.guild,
			payload.interaction.user,
			payload.command
		);
	} else {
		successLoggerData = getSuccessLoggerData(
			payload.message.guild,
			payload.message.author,
			payload.command
		);
	}

	container.logger.debug(
		`${successLoggerData.shard} - ${successLoggerData.commandName} ${successLoggerData.author} ${successLoggerData.sentAt}`
	);
}

export function getSuccessLoggerData(
	guild: Guild | null,
	user: User,
	command: Command
) {
	const shard = getShardInfo(guild?.shardId ?? 0);
	const commandName = getCommandInfo(command);
	const author = getAuthorInfo(user);
	const sentAt = getGuildInfo(guild);

	return { shard, commandName, author, sentAt };
}

function getShardInfo(id: number) {
	return `[${cyan(id.toString())}]`;
}

function getCommandInfo(command: Command) {
	return cyan(command.name);
}

function getAuthorInfo(author: User | APIUser) {
	return `${author.username}[${cyan(author.id)}]`;
}

function getGuildInfo(guild: Guild | null) {
	if (guild === null) return 'Direct Messages';
	return `${guild.name}[${cyan(guild.id)}]`;
}

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
