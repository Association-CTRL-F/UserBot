import type { NewWarning, Warning, WarningUpdate } from '../database/index.js';
import { db } from '../database/index.js';

export class WarningsRepository {
	static async findAll(): Promise<Warning[]> {
		return await db.selectFrom('warnings').selectAll().execute();
	}

	static async findById(id: number): Promise<Warning | undefined> {
		return await db
			.selectFrom('warnings')
			.selectAll()
			.where('id', '=', id)
			.executeTakeFirst();
	}

	static async findByDiscordId(discordId: string): Promise<Warning[]> {
		return await db
			.selectFrom('warnings')
			.selectAll()
			.where('discordID', '=', discordId)
			.orderBy('warnedAt', 'desc')
			.execute();
	}

	static async findByModerator(warnedBy: string): Promise<Warning[]> {
		return await db
			.selectFrom('warnings')
			.selectAll()
			.where('warnedBy', '=', warnedBy)
			.orderBy('warnedAt', 'desc')
			.execute();
	}

	static async getWarningCount(discordId: string): Promise<number> {
		const result = await db
			.selectFrom('warnings')
			.select((eb) => eb.fn.count<number>('id').as('count'))
			.where('discordID', '=', discordId)
			.executeTakeFirst();

		return result?.count || 0;
	}

	static async create(warning: NewWarning): Promise<Warning> {
		return await db
			.insertInto('warnings')
			.values(warning)
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	static async update(
		id: number,
		update: WarningUpdate
	): Promise<Warning | undefined> {
		return await db
			.updateTable('warnings')
			.set(update)
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}

	static async delete(id: number): Promise<boolean> {
		const result = await db
			.deleteFrom('warnings')
			.where('id', '=', id)
			.executeTakeFirst();

		return result.numDeletedRows > 0;
	}

	static async deleteByDiscordId(discordId: string): Promise<number> {
		const result = await db
			.deleteFrom('warnings')
			.where('discordID', '=', discordId)
			.executeTakeFirst();

		return Number(result.numDeletedRows);
	}

	static async getRecentWarnings(days: number = 30): Promise<Warning[]> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		return await db
			.selectFrom('warnings')
			.selectAll()
			.where('warnedAt', '>=', cutoffDate.toISOString())
			.orderBy('warnedAt', 'desc')
			.execute();
	}

	static async searchByReason(reason: string): Promise<Warning[]> {
		return await db
			.selectFrom('warnings')
			.selectAll()
			.where('warnReason', 'ilike', `%${reason}%`)
			.orderBy('warnedAt', 'desc')
			.execute();
	}
}
