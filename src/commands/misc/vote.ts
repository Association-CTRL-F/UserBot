// keep import for tree-shake stability if needed, but unused
import {
	buildAnonymousVoteButtonsRow,
	buildThreadButtonRow,
	createEditedVoteEmbed,
	createVoteEmbed,
} from '#lib/vote';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { RESTJSONErrorCodes, type Message } from 'discord.js';

export class VoteCommand extends Subcommand {
	public constructor(
		context: Subcommand.LoaderContext,
		options: Subcommand.Options
	) {
		super(context, {
			...options,
			name: 'vote',
			description: 'Gère les votes',
			subcommands: [
				{ name: 'create', chatInputRun: 'chatInputCreate', default: true },
				{ name: 'create-anonyme', chatInputRun: 'chatInputCreateAnonyme' },
				{ name: 'edit', chatInputRun: 'chatInputEdit' },
			],
		});
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((sub) =>
					sub
						.setName('create')
						.setDescription('Crée un vote public (réactions).')
						.addStringOption((opt) =>
							opt
								.setName('proposition')
								.setDescription('Proposition de vote')
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('create-anonyme')
						.setDescription('Crée un vote anonyme (boutons).')
						.addStringOption((opt) =>
							opt
								.setName('proposition')
								.setDescription('Proposition de vote')
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('edit')
						.setDescription(
							'Modifie un message de vote avec une nouvelle proposition'
						)
						.addStringOption((opt) =>
							opt
								.setName('id')
								.setDescription('ID du message de vote à éditer')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt
								.setName('proposition')
								.setDescription('Nouvelle proposition de vote')
								.setRequired(true)
						)
				);
			return builder;
		});
	}

	public async chatInputCreate(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const proposition = interaction.options.getString('proposition', true);

		const embed = createVoteEmbed({
			proposition,
			authorUser: interaction.user,
			isAnonymous: false,
		});

		const components = [buildThreadButtonRow()];

		const sentMessage = await interaction.reply({
			embeds: [embed],
			components,
			withResponse: true,
		});

		const message = sentMessage.resource?.message;
		if (message) {
			await message.react('✅');
			await message.react('⌛');
			await message.react('❌');
		}
		return;
	}

	public async chatInputCreateAnonyme(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const proposition = interaction.options.getString('proposition', true);

		const embed = createVoteEmbed({
			proposition,
			authorUser: interaction.user,
			isAnonymous: true,
		});

		const components = [buildAnonymousVoteButtonsRow(), buildThreadButtonRow()];

		await interaction.reply({
			embeds: [embed],
			components,
			withResponse: true,
		});
		return;
	}

	public async chatInputEdit(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const proposition = interaction.options.getString('proposition', true);
		const receivedId = interaction.options.getString('id', true);
		const matchId = receivedId.match(/^(\d{17,19})$/);
		if (!matchId) {
			return interaction.reply({
				content: "Tu ne m'as pas donné un ID valide 😕",
				ephemeral: true,
			});
		}

		const message = await interaction.channel?.messages
			.fetch(matchId[0])
			.catch((error: any) => error);

		if (message instanceof Error) {
			if ((message as any).code === RESTJSONErrorCodes.UnknownMessage) {
				return interaction.reply({
					content: "Je n'ai pas trouvé ce message dans ce salon 😕",
					ephemeral: true,
				});
			}
			throw message;
		}

		const voteMessage = message as Message;
		if (
			!voteMessage.interaction ||
			(voteMessage.interaction.commandName !== 'vote create' &&
				voteMessage.interaction.commandName !== 'vote create-anonyme')
		) {
			return interaction.reply({
				content: "Le message initial n'est pas un vote 😕",
				ephemeral: true,
			});
		}

		if (voteMessage.interaction.user.id !== interaction.user.id) {
			return interaction.reply({
				content: "Tu n'as pas initié ce vote 😕",
				ephemeral: true,
			});
		}

		const previousDescription = voteMessage.embeds[0]?.data?.description;
		const embedEdit = createEditedVoteEmbed({
			proposition,
			authorUser: interaction.user,
			originalCreatedAt: voteMessage.createdAt,
			previousDescription: previousDescription ?? undefined,
		});

		await voteMessage.edit({ embeds: [embedEdit] });
		return interaction.reply({
			content: 'Proposition de vote modifiée 👌',
			ephemeral: true,
		});
	}
}
