import type { Command, CommandUpdate, NewCommand } from '../database/index.js';
import { db } from '../database/index.js';

export class CommandsRepository {
	static async findAll(): Promise<Command[]> {
		return await db.selectFrom('commands').selectAll().execute();
	}

	static async findActive(): Promise<Command[]> {
		return await db
			.selectFrom('commands')
			.selectAll()
			.where('active', '=', true)
			.execute();
	}

	static async findById(id: number): Promise<Command | undefined> {
		return await db
			.selectFrom('commands')
			.selectAll()
			.where('id', '=', id)
			.executeTakeFirst();
	}

	static async findByName(name: string): Promise<Command | undefined> {
		return await db
			.selectFrom('commands')
			.selectAll()
			.where('name', '=', name)
			.executeTakeFirst();
	}

	static async search(query: string): Promise<Command[]> {
		return await db
			.selectFrom('commands')
			.selectAll()
			.where((eb) =>
				eb.or([
					eb('name', 'ilike', `%${query}%`),
					eb('content', 'ilike', `%${query}%`),
					eb('aliases', 'ilike', `%${query}%`),
				])
			)
			.execute();
	}

	static async findByAuthor(author: string): Promise<Command[]> {
		return await db
			.selectFrom('commands')
			.selectAll()
			.where('author', '=', author)
			.execute();
	}

	static async create(command: NewCommand): Promise<Command> {
		return await db
			.insertInto('commands')
			.values(command)
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	static async update(
		id: number,
		update: CommandUpdate
	): Promise<Command | undefined> {
		return await db
			.updateTable('commands')
			.set(update)
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}

	static async delete(id: number): Promise<boolean> {
		const result = await db
			.deleteFrom('commands')
			.where('id', '=', id)
			.executeTakeFirst();

		return result.numDeletedRows > 0;
	}

	static async incrementUsage(id: number): Promise<Command | undefined> {
		return await db
			.updateTable('commands')
			.set((eb) => ({
				numberOfUses: eb('numberOfUses', '+', 1),
			}))
			.where('id', '=', id)
			.returningAll()
			.executeTakeFirst();
	}

	static async getMostUsed(limit: number = 10): Promise<Command[]> {
		return await db
			.selectFrom('commands')
			.selectAll()
			.orderBy('numberOfUses', 'desc')
			.limit(limit)
			.execute();
	}
}
