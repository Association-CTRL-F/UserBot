import { Subcommand } from '@sapphire/plugin-subcommands';
import type { GuildTextBasedChannel, Snowflake } from 'discord.js';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

export class ClearCommand extends Subcommand {
	public constructor(
		context: Subcommand.LoaderContext,
		options: Subcommand.Options
	) {
		super(context, {
			...options,
			name: 'clear',
			description: 'Supprime des messages dans le salon',
			requiredClientPermissions: ['ManageMessages'],
			requiredUserPermissions: ['ManageMessages'],
			subcommands: [
				{ name: 'clear', chatInputRun: 'chatInputClear', default: true },
				{ name: 'clear-depuis', chatInputRun: 'chatInputClearDepuis' },
				{ name: 'clear-entre', chatInputRun: 'chatInputClearEntre' },
			],
		});
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((sub) =>
					sub
						.setName('clear')
						.setDescription('Supprime N messages récents (1-99).')
						.addIntegerOption((opt) =>
							opt
								.setName('nombre')
								.setDescription('Nombre de messages à supprimer')
								.setRequired(true)
								.setMinValue(1)
								.setMaxValue(99)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('clear-depuis')
						.setDescription(
							'Supprime tous les messages postés après un message donné.'
						)
						.addStringOption((opt) =>
							opt
								.setName('id')
								.setDescription("ID du message d'ancrage (non supprimé)")
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('clear-entre')
						.setDescription(
							'Supprime tous les messages entre deux messages donnés (exclus).'
						)
						.addStringOption((opt) =>
							opt
								.setName('debut')
								.setDescription('ID du message de début (exclu)')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt
								.setName('fin')
								.setDescription('ID du message de fin (exclu)')
								.setRequired(true)
						)
				);
			return builder.setDefaultMemberPermissions(
				PermissionFlagsBits.ManageMessages
			);
		});
	}

	public async chatInputClear(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const channel = this.validateChannel(interaction);
		if (!channel) return;

		const count = interaction.options.getInteger('nombre', true);
		const deleted = await channel.bulkDelete(count, true);

		return this.replyWithCount(interaction, deleted.size);
	}

	public async chatInputClearDepuis(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const channel = this.validateChannel(interaction);
		if (!channel) return;

		const messageId = this.validateMessageId(interaction, 'id');
		if (!messageId) return;

		const anchorMessage = await this.fetchMessage(channel, messageId);
		if (!anchorMessage) {
			return this.replyError(
				interaction,
				"Je n'ai pas trouvé ce message dans ce salon 😕"
			);
		}

		const deletedCount = await this.deleteFromMessage(channel, anchorMessage);
		return this.replyWithCount(interaction, deletedCount);
	}

	public async chatInputClearEntre(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const channel = this.validateChannel(interaction);
		if (!channel) return;

		const startId = this.validateMessageId(interaction, 'debut');
		const endId = this.validateMessageId(interaction, 'fin');
		if (!startId || !endId) return;

		const [startMessage, endMessage] = await Promise.all([
			this.fetchMessage(channel, startId),
			this.fetchMessage(channel, endId),
		]);

		if (!startMessage || !endMessage) {
			return this.replyError(
				interaction,
				"Je n'ai pas trouvé l'un des messages dans ce salon 😕"
			);
		}

		const deletedCount = await this.deleteBetweenMessages(
			channel,
			startMessage,
			endMessage
		);
		return this.replyWithCount(interaction, deletedCount);
	}

	private validateChannel(
		interaction: Subcommand.ChatInputCommandInteraction
	): GuildTextBasedChannel | null {
		if (
			!interaction.inCachedGuild() ||
			!interaction.channel ||
			!this.isGuildTextBased(interaction.channel)
		) {
			this.replyError(
				interaction,
				"Cette commande doit être utilisée dans un salon textuel d'un serveur."
			);
			return null;
		}
		return interaction.channel;
	}

	private validateMessageId(
		interaction: Subcommand.ChatInputCommandInteraction,
		optionName: string
	): Snowflake | null {
		const receivedId = interaction.options.getString(optionName, true);
		const matchId = receivedId.match(/^(\d{17,19})$/);
		if (!matchId) {
			this.replyError(interaction, "Tu ne m'as pas donné un ID valide 😕");
			return null;
		}
		return matchId[0] as Snowflake;
	}

	private async fetchMessage(
		channel: GuildTextBasedChannel,
		messageId: Snowflake
	) {
		return channel.messages.fetch(messageId).catch(() => null);
	}

	private async deleteFromMessage(
		channel: GuildTextBasedChannel,
		anchorMessage: any
	): Promise<number> {
		const deletedAfter = await this.deleteAfter(
			channel,
			anchorMessage.id as Snowflake
		);
		const anchorDeleted = await this.deleteMessage(anchorMessage);
		return deletedAfter + anchorDeleted;
	}

	private async deleteBetweenMessages(
		channel: GuildTextBasedChannel,
		startMessage: any,
		endMessage: any
	): Promise<number> {
		const startId = startMessage.id as Snowflake;
		const endId = endMessage.id as Snowflake;
		const [olderId, newerId] = this.sortMessageIds(startId, endId);
		return this.deleteBetween(channel, olderId, newerId);
	}

	private sortMessageIds(
		idA: Snowflake,
		idB: Snowflake
	): [Snowflake, Snowflake] {
		return this.compareSnowflakes(idA, idB) < 0 ? [idA, idB] : [idB, idA];
	}

	private async deleteMessage(message: any): Promise<number> {
		try {
			await message.delete();
			return 1;
		} catch {
			return 0;
		}
	}

	private replyWithCount(
		interaction: Subcommand.ChatInputCommandInteraction,
		count: number
	) {
		return interaction.reply({
			content: `Supprimé ${count} message(s).`,
			flags: MessageFlags.Ephemeral,
		});
	}

	private replyError(
		interaction: Subcommand.ChatInputCommandInteraction,
		message: string
	) {
		return interaction.reply({
			content: message,
			flags: MessageFlags.Ephemeral,
		});
	}

	private isGuildTextBased(
		channel: GuildTextBasedChannel | any
	): channel is GuildTextBasedChannel {
		return (
			typeof channel?.bulkDelete === 'function' &&
			typeof channel?.messages?.fetch === 'function'
		);
	}

	/**
	 * Deletes messages newer than the anchor (anchor excluded), in chunks of 100.
	 */
	private async deleteAfter(
		channel: GuildTextBasedChannel,
		anchorId: Snowflake
	): Promise<number> {
		let totalDeleted = 0;
		let cursor: Snowflake | undefined = anchorId;

		for (;;) {
			const fetched = await channel.messages.fetch({
				after: cursor,
				limit: 100,
			});
			if (fetched.size === 0) break;

			const deleted = await channel.bulkDelete(fetched, true);
			totalDeleted += deleted.size;

			// Advance the cursor to the newest fetched message
			const newest = fetched.first();
			if (!newest) break;
			cursor = newest.id as Snowflake;
		}

		return totalDeleted;
	}

	/**
	 * Deletes messages strictly between two message IDs (bounds excluded), in chunks of 100.
	 */
	private async deleteBetween(
		channel: GuildTextBasedChannel,
		olderId: Snowflake,
		newerId: Snowflake
	): Promise<number> {
		let totalDeleted = 0;
		let beforeCursor: Snowflake | undefined = newerId;

		for (;;) {
			const fetched = await channel.messages.fetch({
				before: beforeCursor,
				limit: 100,
			});
			if (fetched.size === 0) break;

			// Keep only messages strictly greater than olderId (i.e., newer than the lower bound)
			const toDelete = fetched.filter(
				(m) => this.compareSnowflakes(m.id as Snowflake, olderId) > 0
			);
			if (toDelete.size > 0) {
				const deleted = await channel.bulkDelete(toDelete, true);
				totalDeleted += deleted.size;
			}

			// Move the cursor olderwards using the oldest fetched message
			const oldest = fetched.last();
			if (!oldest) break;
			beforeCursor = oldest.id as Snowflake;

			// Stop when oldest fetched is older-or-equal to the lower bound
			if (this.compareSnowflakes(beforeCursor, olderId) <= 0) break;
		}

		return totalDeleted;
	}

	/**
	 * Compares two snowflakes by time. Returns negative if a < b, positive if a > b, 0 if equal.
	 */
	private compareSnowflakes(a: Snowflake, b: Snowflake): number {
		return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
	}
}
