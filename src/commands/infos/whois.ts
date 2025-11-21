import { COLORS } from '#lib/constants';
import { convertDateForDiscord, diffDate } from '#lib/utils';
import { WarningsRepository } from '#repository/index';
import { Command } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
import { EmbedBuilder, MessageFlags } from 'discord.js';

export class WhoisCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: 'whois',
			description: 'Donne des infos sur un utilisateur',
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((opt) =>
					opt.setName('membre').setDescription('Membre à inspecter')
				)
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction
	) {
		if (!interaction.inCachedGuild()) {
			return interaction.reply({
				content: 'Commande disponible uniquement sur un serveur.',
				flags: MessageFlags.Ephemeral,
			});
		}

		const targetUser =
			interaction.options.getUser('membre') ?? interaction.user;

		const member = await interaction.guild.members
			.fetch(targetUser.id)
			.catch(() => null);

		if (!member) {
			return interaction.reply({
				content:
					"Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				flags: MessageFlags.Ephemeral,
			});
		}

		const [warningCount, banCount] = await Promise.all([
			WarningsRepository.getWarningCount(member.id),
			this.getBanCount(member.id),
		]);

		const embed = new EmbedBuilder()
			.setColor(member.displayColor || COLORS.DEFAULT)
			.setAuthor({
				name: this.formatMemberHeading(member),
				iconURL: member.user.displayAvatarURL(),
			})
			.addFields([
				{
					name: "Compte de l'utilisateur",
					value: member.user.tag,
					inline: true,
				},
				{
					name: 'Compte créé le',
					value: this.formatDate(member.user.createdAt),
					inline: true,
				},
				{
					name: 'Âge du compte',
					value: diffDate(member.user.createdAt, {
						excludeZeroUnits: true,
					}),
					inline: true,
				},
				{
					name: 'Mention',
					value: member.toString(),
					inline: true,
				},
				{
					name: 'Serveur rejoint le',
					value: this.formatDate(member.joinedAt),
					inline: true,
				},
				{
					name: 'Est sur le serveur depuis',
					value: diffDate(member.joinedAt, {
						excludeZeroUnits: true,
						defaultMessage: 'Inconnu',
					}),
					inline: true,
				},
				{
					name: 'Historique',
					value: `Nombre d'avertissement(s) : ${warningCount}\nA déjà été banni : ${banCount} fois`,
				},
			]);

		if (member.premiumSince) {
			embed.addFields({
				name: 'Boost Nitro depuis',
				value: diffDate(member.premiumSince, {
					excludeZeroUnits: true,
				}),
				inline: true,
			});
		}

		return interaction.reply({ embeds: [embed] });
	}

	private formatMemberHeading(member: GuildMember) {
		return `${member.displayName} (ID : ${member.id})`;
	}

	private formatDate(date: Date | null | undefined) {
		return date ? convertDateForDiscord(date) : 'Inconnu';
	}

	private async getBanCount(_discordId: string) {
		return 0;
	}
}

