import { LOG_LEVELS, type LogLevel } from '#lib/log_levels';
import {
	ChatInputCommandSuccessPayload,
	Command,
	container,
	ContextMenuCommandSuccessPayload,
	MessageCommandSuccessPayload,
} from '@sapphire/framework';
import { bgBlue, bgGreen, cyan, gray } from 'colorette';
import { APIUser, Guild, User } from 'discord.js';

type LoggerOptions = {
	prefix?: string | null;
};

type Values = unknown[];

/**
 * Thin wrapper over Sapphire's container.logger with optional message prefix.
 */
export class Logger {
	private readonly prefix: string | null;

	public constructor({ prefix = null }: LoggerOptions = {}) {
		this.prefix = prefix;
	}

	private write(level: LogLevel, values: Values): void {
		if (this.prefix) {
			container.logger[level](this.prefix, ...values);
			return;
		}

		container.logger[level](...values);
	}

	public trace(...values: Values): void {
		this.write(LOG_LEVELS.Trace, values);
	}

	public debug(...values: Values): void {
		this.write(LOG_LEVELS.Debug, values);
	}

	public info(...values: Values): void {
		this.write(LOG_LEVELS.Info, values);
	}

	public warn(...values: Values): void {
		this.write(LOG_LEVELS.Warn, values);
	}

	public error(...values: Values): void {
		this.write(LOG_LEVELS.Error, values);
	}

	public fatal(...values: Values): void {
		this.write(LOG_LEVELS.Fatal, values);
	}
}

export const CreateCommandLogger = (commandName: string) =>
	new Logger({ prefix: `[${gray('Command')} ${bgBlue(commandName)}]` });

export const CreateListenerLogger = (listenerName: string) =>
	new Logger({ prefix: `[${gray('Listener')} ${bgGreen(listenerName)}]` });

export function getSuccessCommandText(
	payload:
		| ContextMenuCommandSuccessPayload
		| ChatInputCommandSuccessPayload
		| MessageCommandSuccessPayload
): string {
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

	return `${successLoggerData.shard} - ${successLoggerData.commandName} ${successLoggerData.author} ${successLoggerData.sentAt}`;
}

function getSuccessLoggerData(
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
