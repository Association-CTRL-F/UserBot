import { COLORS } from '#lib/constants';
import { prettyDate } from '#lib/utils';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type User,
} from 'discord.js';

export const VOTE_EMOJI_MAP: Record<VoteChoice, string> = {
	yes: '✅',
	wait: '⌛',
	no: '❌',
};

export function buildCountsDescription(counts: {
	yes: number;
	wait: number;
	no: number;
}) {
	return `${VOTE_EMOJI_MAP.yes} : ${counts.yes}\r${VOTE_EMOJI_MAP.wait} : ${counts.wait}\r${VOTE_EMOJI_MAP.no} : ${counts.no}`;
}

export function buildAnonymousVoteButtonsRow() {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setEmoji(VOTE_EMOJI_MAP.yes)
			.setCustomId(VOTE_CUSTOM_IDS.YES)
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setEmoji(VOTE_EMOJI_MAP.wait)
			.setCustomId(VOTE_CUSTOM_IDS.WAIT)
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setEmoji(VOTE_EMOJI_MAP.no)
			.setCustomId(VOTE_CUSTOM_IDS.NO)
			.setStyle(ButtonStyle.Secondary)
	);
}

export function buildThreadButtonRow() {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(VOTE_CUSTOM_IDS.THREAD_BUTTON)
			.setLabel('Créer un thread')
			.setStyle(ButtonStyle.Primary)
	);
}

export function createVoteEmbed(params: {
	proposition: string;
	authorUser: User;
	isAnonymous: boolean;
	createdAt?: Date;
}) {
	const {
		proposition,
		authorUser,
		isAnonymous,
		createdAt = new Date(),
	} = params;
	const embed = new EmbedBuilder()
		.setColor(COLORS.DEFAULT)
		.setTitle(isAnonymous ? 'Nouveau vote (anonyme)' : 'Nouveau vote')
		.addFields([{ name: 'Proposition', value: `\`\`\`${proposition}\`\`\`` }])
		.setAuthor({
			name: `${authorUser.username} (ID : ${authorUser.id})`,
			iconURL: authorUser.displayAvatarURL(),
		})
		.setFooter({ text: `Vote posté le ${prettyDate(createdAt)}` });

	if (isAnonymous) {
		embed.setDescription(buildCountsDescription({ yes: 0, wait: 0, no: 0 }));
	}

	return embed;
}

export function createEditedVoteEmbed(params: {
	proposition: string;
	authorUser: User;
	originalCreatedAt: Date;
	previousDescription?: string | null;
}) {
	const { proposition, authorUser, originalCreatedAt, previousDescription } =
		params;
	const embed = new EmbedBuilder()
		.setColor(COLORS.DEFAULT)
		.setTitle('Nouveau vote (modifié)')
		.addFields([{ name: 'Proposition', value: `\`\`\`${proposition}\`\`\`` }])
		.setAuthor({
			name: `${authorUser.username} (ID : ${authorUser.id})`,
			iconURL: authorUser.displayAvatarURL(),
		})
		.setFooter({
			text: `Vote posté le ${prettyDate(originalCreatedAt)}\nModifié le ${prettyDate(new Date())}`,
		});

	if (previousDescription) embed.setDescription(previousDescription);
	return embed;
}

export const VOTE_CUSTOM_IDS = {
	THREAD_BUTTON: 'vote:create-thread',
	YES: 'vote:yes',
	WAIT: 'vote:wait',
	NO: 'vote:no',
} as const;

export type VoteChoice = 'yes' | 'wait' | 'no';
