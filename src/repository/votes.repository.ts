import { db, type NewVote } from '#database/index';

export type AnonymousVoteChoice = 'yes' | 'wait' | 'no';

function nowIso() {
	return new Date().toISOString();
}

export class VotesRepository {
	static async upsert(
		messageId: string,
		memberId: string,
		vote: AnonymousVoteChoice
	) {
		const insert: NewVote = {
			messageId,
			memberId,
			vote,
			createdAt: nowIso(),
			editedAt: null,
		};

		return await db
			.insertInto('votes')
			.values(insert)
			.onConflict((oc) =>
				oc.columns(['messageId', 'memberId']).doUpdateSet(({ eb }) => ({
					vote: eb.ref('excluded.vote'),
					editedAt: nowIso(),
				}))
			)
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	static async countsByMessage(messageId: string) {
		const rows = await db
			.selectFrom('votes')
			.select((eb) => [
				eb.ref('vote').as('vote'),
				eb.fn.countAll<number>().as('count'),
			])
			.where('messageId', '=', messageId)
			.groupBy('vote')
			.execute();

		const typedRows = rows as Array<{
			vote: AnonymousVoteChoice;
			count: number;
		}>;

		const counts = typedRows.reduce<Record<AnonymousVoteChoice, number>>(
			(acc, { vote, count }) => {
				acc[vote] = count;
				return acc;
			},
			{ yes: 0, wait: 0, no: 0 }
		);

		return { yes: counts.yes, wait: counts.wait, no: counts.no } as const;
	}
}
