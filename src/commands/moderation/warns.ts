import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
	MessageFlags,
	type APIEmbedField,
	type Attachment,
	type Guild,
} from 'discord.js';

import { convertDateForDiscord } from '#lib/utils';
import { warningsService } from '#services/warnings.service';
import { WarningsRepository } from '#repository/index';

const WARN_COLOR = '#C27C0E';
const DISCORD_ID_REGEX = /^(\d{17,19})$/;

export class WarnsCommand extends Subcommand {
	public constructor(
		context: Subcommand.LoaderContext,
		options: Subcommand.Options
	) {
		super(context, {
			...options,
			name: 'warns',
			description: 'Gère les avertissements',
			subcommands: [
				{ name: 'view', chatInputRun: 'chatInputView', default: true },
				{ name: 'create', chatInputRun: 'chatInputCreate' },
				{ name: 'edit', chatInputRun: 'chatInputEdit' },
				{ name: 'del', chatInputRun: 'chatInputDelete' },
				{ name: 'clear', chatInputRun: 'chatInputClear' },
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
						.setName('view')
						.setDescription("Voir les avertissements d'un membre")
						.addStringOption((opt) =>
							opt
								.setName('membre')
								.setDescription('Discord ID')
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('create')
						.setDescription('Crée un nouvel avertissement')
						.addStringOption((opt) =>
							opt
								.setName('membre')
								.setDescription('Discord ID')
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt
								.setName('raison')
								.setDescription("Raison de l'avertissement")
								.setRequired(true)
						)
						.addBooleanOption((opt) =>
							opt
								.setName('notify')
								.setDescription('Avertir le membre par message privé')
								.setRequired(true)
						)
						.addAttachmentOption((opt) =>
							opt
								.setName('preuve')
								.setDescription("Preuve de l'avertissement")
								.setRequired(false)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('edit')
						.setDescription('Modifie un avertissement')
						.addStringOption((opt) =>
							opt
								.setName('id')
								.setDescription("ID de l'avertissement")
								.setRequired(true)
						)
						.addStringOption((opt) =>
							opt
								.setName('raison')
								.setDescription("Nouvelle raison de l'avertissement")
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('del')
						.setDescription('Supprime un avertissement')
						.addStringOption((opt) =>
							opt
								.setName('id')
								.setDescription("ID de l'avertissement")
								.setRequired(true)
						)
				)
				.addSubcommand((sub) =>
					sub
						.setName('clear')
						.setDescription("Supprime tous les avertissements d'un membre")
						.addStringOption((opt) =>
							opt
								.setName('membre')
								.setDescription('Discord ID')
								.setRequired(true)
						)
				)
		);
	}

	public async chatInputView(interaction: Subcommand.ChatInputCommandInteraction) {
		if (!interaction.inCachedGuild()) {
			return interaction.reply({
				content: 'Commande disponible uniquement sur un serveur.',
				flags: MessageFlags.Ephemeral,
			});
		}

		const guild = interaction.guild;
		const discordId = interaction.options.getString('membre', true);

		if (!DISCORD_ID_REGEX.test(discordId)) {
			return interaction.reply({
				content: "Tu ne m'as pas donné un ID valide 😕",
				flags: MessageFlags.Ephemeral,
			});
		}

		const warnings = await WarningsRepository.findByDiscordId(discordId);

		if (!warnings.length) {
			return interaction.reply({
				content: "Aucun avertissement n'a été créé pour cet utilisateur.",
				flags: MessageFlags.Ephemeral,
			});
		}

		const member = await guild.members.fetch(discordId).catch(() => null);

		const chunks = this.chunk(warnings, 5);
		const paginated = new PaginatedMessage();

		chunks.forEach((chunk, pageIndex) => {
			paginated.addPageEmbed((embed) =>
				embed
					.setColor(WARN_COLOR)
					.setAuthor(
						member
							? {
									name: `${member.displayName} (ID : ${member.id})`,
									iconURL: member.displayAvatarURL(),
								}
							: { name: `ID ${discordId}` }
					)
					.setDescription(`**Total : ${warnings.length}**`)
					.setFields(this.buildFields(chunk, guild))
					.setFooter({
						text: `Page ${pageIndex + 1} / ${chunks.length}`,
					})
			);
		});

		return paginated.run(interaction);
	}

	public async chatInputCreate(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		if (!interaction.inCachedGuild()) {
			return interaction.reply({
				content: 'Commande disponible uniquement sur un serveur.',
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const discordId = interaction.options.getString('membre', true);
		if (!DISCORD_ID_REGEX.test(discordId)) {
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID valide 😕",
			});
		}

		const reason = interaction.options.getString('raison', true);
		const notify = interaction.options.getBoolean('notify', true);
		const proof = interaction.options.getAttachment('preuve');

		const member = await interaction.guild.members
			.fetch(discordId)
			.catch(() => null);

		await warningsService.createWarning({
			discordId,
			warnedBy: interaction.user.id,
			reason,
			proofUrl: this.extractAttachmentUrl(proof),
		});

		let dmInfo = '';

		if (notify && member) {
			const notification = await warningsService.notifyMember(member, reason);
			if (!notification.success && notification.errorMessage) {
				dmInfo = notification.errorMessage;
			}
		}

		return interaction.editReply({
			content: `⚠️ \`${member?.user.tag ?? discordId}\` a reçu un avertissement\n\nRaison : ${reason}\n\nNotification en message privé : ${
				notify && member ? 'Oui' : 'Non'
			}${dmInfo}${
				proof ? `\n\nPreuve : <${this.extractAttachmentUrl(proof)}>` : ''
			}`,
		});
	}

	public async chatInputEdit(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		if (!interaction.inCachedGuild()) {
			return interaction.reply({
				content: 'Commande disponible uniquement sur un serveur.',
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const id = Number(interaction.options.getString('id', true));
		const reason = interaction.options.getString('raison', true);

		if (!Number.isInteger(id)) {
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID d'avertissement valide 😕",
			});
		}

		const warning = await WarningsRepository.findById(id);

		if (!warning) {
			return interaction.editReply({
				content: "L'avertissement n'existe pas 😬",
			});
		}

		if (warning.warnedBy !== interaction.user.id) {
			return interaction.editReply({
				content: "L'avertissement ne t'appartient pas 😬",
			});
		}

		const updated = await WarningsRepository.update(id, {
			warnReason: reason,
		});

		if (!updated) {
			return interaction.editReply({
				content:
					"Une erreur est survenue lors de la modification de l'avertissement 😬",
			});
		}

		return interaction.editReply({
			content: "L'avertissement a bien été modifié 👌",
		});
	}

	public async chatInputDelete(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		if (!interaction.inCachedGuild()) {
			return interaction.reply({
				content: 'Commande disponible uniquement sur un serveur.',
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const id = Number(interaction.options.getString('id', true));

		if (!Number.isInteger(id)) {
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID d'avertissement valide 😕",
			});
		}

		const deleted = await WarningsRepository.delete(id);

		if (!deleted) {
			return interaction.editReply({
				content: "L'avertissement n'existe pas 😬",
			});
		}

		return interaction.editReply({
			content: "L'avertissement a bien été supprimé 👌",
		});
	}

	public async chatInputClear(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		if (!interaction.inCachedGuild()) {
			return interaction.reply({
				content: 'Commande disponible uniquement sur un serveur.',
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const discordId = interaction.options.getString('membre', true);

		if (!DISCORD_ID_REGEX.test(discordId)) {
			return interaction.editReply({
				content: "Tu ne m'as pas donné un ID valide 😕",
			});
		}

		const count = await WarningsRepository.deleteByDiscordId(discordId);

		if (count === 0) {
			return interaction.editReply({
				content: "Ce membre n'a pas d'avertissements 😕",
			});
		}

		return interaction.editReply({
			content: `Les ${count} avertissement(s) ont bien été supprimés 👌`,
		});
	}

	private chunk<T>(values: T[], size: number) {
		const chunks: T[][] = [];
		for (let i = 0; i < values.length; i += size) {
			chunks.push(values.slice(i, i + size));
		}
		return chunks;
	}

	private buildFields(
		warnings: Awaited<ReturnType<typeof WarningsRepository.findByDiscordId>>,
		guild: Guild
	): APIEmbedField[] {
		return warnings.map((warning) => {
			const moderator =
				guild.members.cache.get(warning.warnedBy)?.user;
			const executor = moderator
				? `${moderator.tag}`
				: warning.warnedBy;

			const proof = warning.warnPreuve
				? `\nPreuve : <${warning.warnPreuve}>`
				: '';

			return {
				name: `Avertissement #${warning.id}`,
				value: `Par ${executor} - ${convertDateForDiscord(
					new Date(warning.warnedAt)
				)}\nRaison : ${warning.warnReason}${proof}`,
			};
		});
	}

	private extractAttachmentUrl(attachment: Attachment | null) {
		return attachment?.url ?? null;
	}
}

