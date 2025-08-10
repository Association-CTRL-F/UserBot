import { COLORS } from '#lib/constants';
import {
	convertDateForDiscord,
	diffDate,
	getDiscordjsVersion,
	prettyNumber,
} from '#lib/utils';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { EmbedBuilder } from 'discord.js';
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
					name: await resolveKey(interaction, 'commands/infos:bot.api_latency'),
					value: `${client.ws.ping} ms`,
				},
				{
					name: await resolveKey(interaction, 'commands/infos:bot.uptime'),
					value: diffDate(client.readyAt!),
				},
				{
					name: await resolveKey(interaction, 'commands/infos:bot.prefix'),
					value: `\`${prefix}\``,
				},
				{
					name: await resolveKey(interaction, 'commands/infos:bot.version'),
					value: botVersion,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:bot.discordjs_version'
					),
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
					name: await resolveKey(
						interaction,
						'commands/infos:server.created_at'
					),
					value: convertDateForDiscord(guild.createdAt),
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.server_age'
					),
					value: diffDate(guild.createdAt),
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.highest_role'
					),
					value: guild.roles.highest.toString(),
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.member_count'
					),
					value: `${prettyNumber(guild.memberCount)} / ${prettyNumber(guild.maximumMembers ?? '∞')}`,
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.emoji_count'
					),
					value: prettyNumber(guild.emojis.cache.size),
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.channel_count'
					),
					value: prettyNumber(guild.channels.cache.size),
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.verification_level'
					),
					value: await resolveKey(
						interaction,
						`commands/infos:server.verification_level_map.${Number(guild.verificationLevel)}`
					),
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.mfa_level'
					),
					value: await resolveKey(
						interaction,
						`commands/infos:server.mfa_level_map.${Number(guild.mfaLevel)}`
					),
					inline: true,
				},
				{
					name: await resolveKey(
						interaction,
						'commands/infos:server.premium_tier'
					),
					value: await resolveKey(
						interaction,
						`commands/infos:server.premium_tier_map.${Number(guild.premiumTier)}`
					),
					inline: true,
				},
			]);

		return interaction.reply({ embeds: [embedServer] });
	}
}
