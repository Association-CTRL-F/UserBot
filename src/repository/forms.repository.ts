import type { Form } from '#database/index';
import { db } from '#database/index';

export class FormsRepository {
	static async findByName(name: string): Promise<Form | undefined> {
		return await db
			.selectFrom('forms')
			.selectAll()
			.where('name', '=', name)
			.executeTakeFirst();
	}
}

