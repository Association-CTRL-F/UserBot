import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createIndex('votes_message_member_unique')
		.on('votes')
		.columns(['messageId', 'memberId'])
		.unique()
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('votes_message_member_unique').execute();
}
