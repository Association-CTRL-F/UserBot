import {
	COLORS,
	PREMIUM_TIER_MAP,
	VERIFICATION_LEVEL_MAP,
} from '#lib/constants';
import {
	convertDateForDiscord,
	diffDate,
	getDiscordjsVersion,
	prettyNumber,
} from '#lib/utils';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { EmbedBuilder, GuildMFALevel } from 'discord.js';
import packageJson from '../../../package.json' with { type: 'json' };

export class BotInfosCommand extends Subcommand {
	public constructor(
		context: Subcommand.LoaderContext,
		options: Subcommand.Options
	) {
		super(context, {
			...options,
			name: 'infos',
			description: 'Donne quelques infos sur le serveur et le bot',
			subcommands: [
				{ name: 'bot', chatInputRun: 'chatInputBot', default: true },
				{ name: 'server', chatInputRun: 'chatInputServer' },
			],
		});
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((sub) =>
					sub.setName('bot').setDescription('Infos du bot')
				)
				.addSubcommand((sub) =>
					sub.setName('server').setDescription('Infos du serveur')
				);
			return builder;
		});
	}

	public async chatInputBot(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const client = this.container.client;
		const botVersion = packageJson.version;
		const prefix = client.options.defaultPrefix;
		const discordjsVersion = getDiscordjsVersion();

		const embedBot = new EmbedBuilder()
			.setColor(COLORS.DEFAULT)
			.setAuthor({
				name: `${client.user!.username} (ID : ${client.user!.id})`,
				iconURL: client.user!.displayAvatarURL(),
			})
			.addFields([
				{
					name: 'Latence API',
					value: `${client.ws.ping} ms`,
				},
				{
					name: 'Uptime',
					value: diffDate(client.readyAt!),
				},
				{
					name: 'Prefix',
					value: `\`${prefix}\``,
				},
				{
					name: 'Version',
					value: botVersion,
				},
				{
					name: 'Version Discord.js',
					value: discordjsVersion,
				},
			]);

		return interaction.reply({ embeds: [embedBot] });
	}

	public async chatInputServer(
		interaction: Subcommand.ChatInputCommandInteraction
	) {
		const guild = interaction.guild!;

		const embedServer = new EmbedBuilder()
			.setColor(COLORS.DEFAULT)
			.setAuthor({
				name: `${guild.name} (ID : ${guild.id})`,
				iconURL: guild.iconURL() ?? undefined,
			})
			.addFields([
				{
					name: 'Date de création',
					value: convertDateForDiscord(guild.createdAt),
					inline: true,
				},
				{
					name: 'Âge du serveur',
					value: diffDate(guild.createdAt),
					inline: true,
				},
				{
					name: 'Rôle le plus élevé',
					value: guild.roles.highest.toString(),
					inline: true,
				},
				{
					name: 'Nombre de membres',
					value: `${prettyNumber(guild.memberCount)} / ${prettyNumber(guild.maximumMembers ?? '∞')}`,
					inline: true,
				},
				{
					name: "Nombre d'émojis",
					value: prettyNumber(guild.emojis.cache.size),
					inline: true,
				},
				{
					name: 'Nombre de salons',
					value: prettyNumber(guild.channels.cache.size),
					inline: true,
				},
				{
					name: 'Niveau de vérification',
					value: VERIFICATION_LEVEL_MAP[guild.verificationLevel],
					inline: true,
				},
				{
					name: 'A2F',
					value:
						guild.mfaLevel === GuildMFALevel.Elevated ? 'Activé' : 'Désactivé',
					inline: true,
				},
				{
					name: 'Niveau Boost Nitro',
					value: PREMIUM_TIER_MAP[guild.premiumTier],
					inline: true,
				},
			]);

		return interaction.reply({ embeds: [embedServer] });
	}
}
