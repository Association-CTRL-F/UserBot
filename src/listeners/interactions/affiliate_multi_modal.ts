import {
	AffiliateApiError,
	affiliateService,
} from '#services/affiliate.service';
import { Events, Listener } from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';

export class AffiliateMultiModalListener extends Listener<
	typeof Events.InteractionCreate
> {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options
	) {
		super(context, { ...options, event: Events.InteractionCreate });
	}

	public override async run(interaction: ModalSubmitInteraction) {
		if (!interaction.isModalSubmit()) return;
		if (interaction.customId !== 'affiliate-multi') return;

		const rawInput = interaction.fields.getTextInputValue(
			'liens-affiliate-multi'
		);
		const urls = rawInput
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

		if (!urls.length) {
			return interaction.reply({
				content: 'Aucun lien fourni 😕',
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const results = await affiliateService.createLinks(urls);
			const response = results.map((result) => `<${result}>`).join('\n');
			return interaction.editReply({ content: response });
		} catch (error) {
			const message =
				error instanceof AffiliateApiError
					? error.message
					: "Une erreur est survenue lors de la création d'un lien 😕";
			this.container.logger.error(error);
			return interaction.editReply({ content: message });
		}
	}
}
