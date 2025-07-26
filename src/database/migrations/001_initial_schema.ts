import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('alerts')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('discordID', 'varchar(255)', (col) => col.notNull())
		.addColumn('text', 'text', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('cf')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('pseudo', 'varchar(255)', (col) => col.notNull())
		.addColumn('discordID', 'varchar(255)', (col) => col.notNull())
		.addColumn('active', 'boolean', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('commands')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('name', 'varchar(255)', (col) => col.notNull())
		.addColumn('aliases', 'text')
		.addColumn('active', 'boolean', (col) => col.notNull())
		.addColumn('content', 'text', (col) => col.notNull())
		.addColumn('textLinkButton', 'text')
		.addColumn('linkButton', 'text')
		.addColumn('author', 'varchar(255)', (col) => col.notNull())
		.addColumn('createdAt', 'varchar(255)', (col) => col.notNull())
		.addColumn('lastModificationBy', 'varchar(255)')
		.addColumn('lastModificationAt', 'varchar(255)')
		.addColumn('numberOfUses', 'integer', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('forms')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('name', 'varchar(255)', (col) => col.notNull())
		.addColumn('content', 'text', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('giveaways')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('prize', 'varchar(255)', (col) => col.notNull())
		.addColumn('winnersCount', 'integer', (col) => col.notNull())
		.addColumn('channel', 'varchar(255)', (col) => col.notNull())
		.addColumn('timestampEnd', 'varchar(255)', (col) => col.notNull())
		.addColumn('hostedBy', 'varchar(255)', (col) => col.notNull())
		.addColumn('messageId', 'varchar(255)')
		.addColumn('excludedIds', 'varchar(255)', (col) => col.notNull())
		.addColumn('started', 'boolean', (col) => col.notNull())
		.addColumn('ended', 'boolean', (col) => col.notNull())
		.addColumn('timeoutId', 'integer')
		.execute();

	await db.schema
		.createTable('mute')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('discordID', 'varchar(255)', (col) => col.notNull())
		.addColumn('timestampStart', 'varchar(255)', (col) => col.notNull())
		.addColumn('timestampEnd', 'varchar(255)', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('reminders')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('discordID', 'varchar(255)', (col) => col.notNull())
		.addColumn('reminder', 'text', (col) => col.notNull())
		.addColumn('timestampEnd', 'varchar(255)', (col) => col.notNull())
		.addColumn('channel', 'varchar(255)', (col) => col.notNull())
		.addColumn('private', 'boolean', (col) => col.notNull())
		.addColumn('timeoutId', 'integer', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('vocal')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('channelId', 'varchar(255)', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('votes')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('messageId', 'varchar(255)', (col) => col.notNull())
		.addColumn('memberId', 'varchar(255)', (col) => col.notNull())
		.addColumn('vote', 'varchar(255)', (col) => col.notNull())
		.addColumn('createdAt', 'varchar(255)', (col) => col.notNull())
		.addColumn('editedAt', 'varchar(255)')
		.execute();

	await db.schema
		.createTable('warnings')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('discordID', 'varchar(255)', (col) => col.notNull())
		.addColumn('warnedBy', 'varchar(255)', (col) => col.notNull())
		.addColumn('warnReason', 'text', (col) => col.notNull())
		.addColumn('warnPreuve', 'text')
		.addColumn('warnedAt', 'varchar(255)', (col) => col.notNull())
		.execute();

	await db.schema
		.createIndex('commands_name_idx')
		.on('commands')
		.column('name')
		.execute();

	await db.schema
		.createIndex('commands_content_idx')
		.on('commands')
		.column('content')
		.execute();

	await db.schema
		.createIndex('alerts_discord_id_idx')
		.on('alerts')
		.column('discordID')
		.execute();

	await db.schema
		.createIndex('cf_discord_id_idx')
		.on('cf')
		.column('discordID')
		.execute();

	await db.schema
		.createIndex('mute_discord_id_idx')
		.on('mute')
		.column('discordID')
		.execute();

	await db.schema
		.createIndex('reminders_discord_id_idx')
		.on('reminders')
		.column('discordID')
		.execute();

	await db.schema
		.createIndex('votes_message_id_idx')
		.on('votes')
		.column('messageId')
		.execute();

	await db.schema
		.createIndex('warnings_discord_id_idx')
		.on('warnings')
		.column('discordID')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('warnings').execute();
	await db.schema.dropTable('votes').execute();
	await db.schema.dropTable('vocal').execute();
	await db.schema.dropTable('reminders').execute();
	await db.schema.dropTable('mute').execute();
	await db.schema.dropTable('giveaways').execute();
	await db.schema.dropTable('forms').execute();
	await db.schema.dropTable('commands').execute();
	await db.schema.dropTable('cf').execute();
	await db.schema.dropTable('alerts').execute();
}
