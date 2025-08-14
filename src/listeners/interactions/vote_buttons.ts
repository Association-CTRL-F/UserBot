import {
	buildCountsDescription,
	VOTE_CUSTOM_IDS,
	type VoteChoice,
} from '#lib/vote';
import { VotesRepository } from '#repository/index';
import { Events, Listener } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';

export class VoteButtonsListener extends Listener<
	typeof Events.InteractionCreate
> {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, { ...options, event: Events.InteractionCreate });
	}

	public override async run(interaction: ButtonInteraction) {
		if (!interaction.isButton()) return;
		const { customId } = interaction;

		if (customId === VOTE_CUSTOM_IDS.THREAD_BUTTON) {
			if (!interaction.message || !interaction.channel) return;
			const parentMessage = interaction.message;

			const thread = await parentMessage.startThread({
				name: `Vote de ${interaction.user.username}`,
				autoArchiveDuration: 24 * 60,
				reason: 'Thread créé depuis le bouton du vote',
			});

			await thread.members.add(interaction.user.id);
			return interaction.reply({ content: 'Thread créé 👌', ephemeral: true });
		}

		if (
			customId !== VOTE_CUSTOM_IDS.YES &&
			customId !== VOTE_CUSTOM_IDS.WAIT &&
			customId !== VOTE_CUSTOM_IDS.NO
		)
			return;

		const message = interaction.message;
		const embed = message.embeds[0];
		if (!embed || !embed.data?.description) return interaction.deferUpdate();

		// Single-vote per user with vote change allowed
		const messageId = message.id;
		const userId = interaction.user.id;
		const choice: VoteChoice =
			customId === VOTE_CUSTOM_IDS.YES
				? 'yes'
				: customId === VOTE_CUSTOM_IDS.WAIT
					? 'wait'
					: 'no';

		await VotesRepository.upsert(messageId, userId, choice);
		const counts = await VotesRepository.countsByMessage(messageId);
		const newDescription = buildCountsDescription(counts);
		const newEmbed = embed.toJSON();
		newEmbed.description = newDescription;

		await message.edit({ embeds: [newEmbed] });
		return interaction.deferUpdate();
	}
}
