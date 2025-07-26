import type { Alert, AlertUpdate, NewAlert } from '../database/index.js';
import { db } from '../database/index.js';

export class AlertsRepository {
	static async findAll(): Promise<Alert[]> {
		return await db.selectFrom('alerts').selectAll().execute();
	}

	static async findById(id: number): Promise<Alert | undefined> {
		return await db
			.selectFrom('alerts')
			.selectAll()
			.where('id', '=', id)
			.executeTakeFirst();
	}

	static async findByDiscordId(discordId: string): Promise<Alert[]> {
		return await db
			.selectFrom('alerts')
			.selectAll()
			.where('discordID', '=', discordId)
			.execute();
	}

	static async create(alert: NewAlert): Promise<Alert> {
		return await db
			.insertInto('alerts')
			.values(alert)
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	static async update(
		id: number,
		update: AlertUpdate
	): Promise<Alert | undefined> {
		return await db
			.updateTable('alerts')
			.set(update)
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}

	static async delete(id: number): Promise<boolean> {
		const result = await db
			.deleteFrom('alerts')
			.where('id', '=', id)
			.executeTakeFirst();

		return result.numDeletedRows > 0;
	}

	static async deleteByDiscordId(discordId: string): Promise<number> {
		const result = await db
			.deleteFrom('alerts')
			.where('discordID', '=', discordId)
			.executeTakeFirst();

		return Number(result.numDeletedRows);
	}
}
