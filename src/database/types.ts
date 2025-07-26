import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
	alerts: AlertsTable;
	cf: CfTable;
	commands: CommandsTable;
	forms: FormsTable;
	giveaways: GiveawaysTable;
	mute: MuteTable;
	reminders: RemindersTable;
	vocal: VocalTable;
	votes: VotesTable;
	warnings: WarningsTable;
}

export interface AlertsTable {
	id: Generated<number>;
	discordID: string;
	text: string;
}

export interface CfTable {
	id: Generated<number>;
	pseudo: string;
	discordID: string;
	active: boolean;
}

export interface CommandsTable {
	id: Generated<number>;
	name: string;
	aliases: string | null;
	active: boolean;
	content: string;
	textLinkButton: string | null;
	linkButton: string | null;
	author: string;
	createdAt: string;
	lastModificationBy: string | null;
	lastModificationAt: string | null;
	numberOfUses: number;
}

export interface FormsTable {
	id: Generated<number>;
	name: string;
	content: string;
}

export interface GiveawaysTable {
	id: Generated<number>;
	prize: string;
	winnersCount: number;
	channel: string;
	timestampEnd: string;
	hostedBy: string;
	messageId: string | null;
	excludedIds: string;
	started: boolean;
	ended: boolean;
	timeoutId: number | null;
}

export interface MuteTable {
	id: Generated<number>;
	discordID: string;
	timestampStart: string;
	timestampEnd: string;
}

export interface RemindersTable {
	id: Generated<number>;
	discordID: string;
	reminder: string;
	timestampEnd: string;
	channel: string;
	private: boolean;
	timeoutId: number;
}

export interface VocalTable {
	id: Generated<number>;
	channelId: string;
}

export interface VotesTable {
	id: Generated<number>;
	messageId: string;
	memberId: string;
	vote: string;
	createdAt: string;
	editedAt: string | null;
}

export interface WarningsTable {
	id: Generated<number>;
	discordID: string;
	warnedBy: string;
	warnReason: string;
	warnPreuve: string | null;
	warnedAt: string;
}

export type Alert = Selectable<AlertsTable>;
export type NewAlert = Insertable<AlertsTable>;
export type AlertUpdate = Updateable<AlertsTable>;

export type Cf = Selectable<CfTable>;
export type NewCf = Insertable<CfTable>;
export type CfUpdate = Updateable<CfTable>;

export type Command = Selectable<CommandsTable>;
export type NewCommand = Insertable<CommandsTable>;
export type CommandUpdate = Updateable<CommandsTable>;

export type Form = Selectable<FormsTable>;
export type NewForm = Insertable<FormsTable>;
export type FormUpdate = Updateable<FormsTable>;

export type Giveaway = Selectable<GiveawaysTable>;
export type NewGiveaway = Insertable<GiveawaysTable>;
export type GiveawayUpdate = Updateable<GiveawaysTable>;

export type Mute = Selectable<MuteTable>;
export type NewMute = Insertable<MuteTable>;
export type MuteUpdate = Updateable<MuteTable>;

export type Reminder = Selectable<RemindersTable>;
export type NewReminder = Insertable<RemindersTable>;
export type ReminderUpdate = Updateable<RemindersTable>;

export type Vocal = Selectable<VocalTable>;
export type NewVocal = Insertable<VocalTable>;
export type VocalUpdate = Updateable<VocalTable>;

export type Vote = Selectable<VotesTable>;
export type NewVote = Insertable<VotesTable>;
export type VoteUpdate = Updateable<VotesTable>;

export type Warning = Selectable<WarningsTable>;
export type NewWarning = Insertable<WarningsTable>;
export type WarningUpdate = Updateable<WarningsTable>;
