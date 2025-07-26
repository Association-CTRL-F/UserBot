import type {
	Giveaway,
	GiveawayUpdate,
	NewGiveaway,
} from '../database/index.js';
import { db } from '../database/index.js';

export class GiveawaysRepository {
	static async findAll(): Promise<Giveaway[]> {
		return await db.selectFrom('giveaways').selectAll().execute();
	}

	static async findActive(): Promise<Giveaway[]> {
		return await db
			.selectFrom('giveaways')
			.selectAll()
			.where('ended', '=', false)
			.execute();
	}

	static async findById(id: number): Promise<Giveaway | undefined> {
		return await db
			.selectFrom('giveaways')
			.selectAll()
			.where('id', '=', id)
			.executeTakeFirst();
	}

	static async findByChannel(channel: string): Promise<Giveaway[]> {
		return await db
			.selectFrom('giveaways')
			.selectAll()
			.where('channel', '=', channel)
			.execute();
	}

	static async findByHost(hostedBy: string): Promise<Giveaway[]> {
		return await db
			.selectFrom('giveaways')
			.selectAll()
			.where('hostedBy', '=', hostedBy)
			.execute();
	}

	static async findByMessageId(
		messageId: string
	): Promise<Giveaway | undefined> {
		return await db
			.selectFrom('giveaways')
			.selectAll()
			.where('messageId', '=', messageId)
			.executeTakeFirst();
	}

	static async create(giveaway: NewGiveaway): Promise<Giveaway> {
		return await db
			.insertInto('giveaways')
			.values(giveaway)
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	static async update(
		id: number,
		update: GiveawayUpdate
	): Promise<Giveaway | undefined> {
		return await db
			.updateTable('giveaways')
			.set(update)
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}

	static async delete(id: number): Promise<boolean> {
		const result = await db
			.deleteFrom('giveaways')
			.where('id', '=', id)
			.executeTakeFirst();

		return result.numDeletedRows > 0;
	}

	static async markAsStarted(id: number): Promise<Giveaway | undefined> {
		return await db
			.updateTable('giveaways')
			.set({ started: true })
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}

	static async markAsEnded(id: number): Promise<Giveaway | undefined> {
		return await db
			.updateTable('giveaways')
			.set({ ended: true })
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}

	static async getExpiredGiveaways(): Promise<Giveaway[]> {
		const now = new Date().toISOString();
		return await db
			.selectFrom('giveaways')
			.selectAll()
			.where('timestampEnd', '<', now)
			.where('ended', '=', false)
			.execute();
	}

	static async updateTimeoutId(
		id: number,
		timeoutId: number
	): Promise<Giveaway | undefined> {
		return await db
			.updateTable('giveaways')
			.set({ timeoutId })
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}
}
