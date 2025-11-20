import {
	AffiliateApiError,
	affiliateService,
} from '#services/affiliate.service';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
	ActionRowBuilder,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';

export class AffiliateCommand extends Subcommand {
	public constructor(
		context: Subcommand.LoaderContext,
		options: Subcommand.Options
	) {
		super(context, {
			...options,
			name: 'affiliate',
			description: 'Crée des liens affiliés',
			subcommands: [
				{ name: 'simple', chatInputRun: 'chatInputSimple', default: true },
				{ name: 'multi', chatInputRun: 'chatInputMulti' },
			],
		});
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((sub) =>
					sub
						.setName('simple')
						.setDescription('Crée un lien affilié')
						.addStringOption((opt) =>
							opt.setName('url').setDescription('URL longue').setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub.setName('multi').setDescription('Crée des liens affiliés')
				)
		);
	}

	public async chatInputSimple(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const longUrl = interaction.options.getString('url', true);
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const shortUrl = await affiliateService.createLink(longUrl);
			return interaction.editReply({ content: `<${shortUrl}>` });
		} catch (error) {
			const message =
				error instanceof AffiliateApiError
					? error.message
					: 'Une erreur est survenue lors de la création du lien 😕';
			this.container.logger.error(error);
			return interaction.editReply({ content: message });
		}
	}

	public async chatInputMulti(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const modal = this.buildAffiliateModal();
		return interaction.showModal(modal);
	}

	private buildAffiliateModal() {
		return new ModalBuilder()
			.setCustomId('affiliate-multi')
			.setTitle('Création de liens affiliés')
			.addComponents(
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId('liens-affiliate-multi')
						.setLabel('Collez ici les différents liens à affilier')
						.setStyle(TextInputStyle.Paragraph)
						.setMinLength(1)
						.setRequired(false)
				)
			);
	}
}
