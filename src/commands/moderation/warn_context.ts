import { Command } from '@sapphire/framework';
import { ApplicationCommandType, MessageFlags } from 'discord.js';

import { warningsService } from '#services/warnings.service';

const DEFAULT_REASON =
	'Les commandes relatives au bot doivent être utilisées dans le salon dédié sauf si elles sont nécessaires à la discussion en cours.';

export class WarnContextCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: 'warn_command',
			description: 'Avertit rapidement depuis un message',
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerContextMenuCommand((builder) =>
			builder.setName(this.name).setType(ApplicationCommandType.Message)
		);
	}

	public override async contextMenuRun(
		interaction: Command.ContextMenuCommandInteraction
	) {
		if (
			interaction.commandType !== ApplicationCommandType.Message ||
			!interaction.inCachedGuild() ||
			!interaction.isMessageContextMenuCommand()
		) {
			return interaction.reply({
				content: 'Commande disponible uniquement sur un serveur.',
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const targetAuthorId = interaction.targetMessage.author.id;

		const member = await interaction.guild.members
			.fetch(targetAuthorId)
			.catch(() => null);

		if (!member) {
			return interaction.editReply({
				content:
					"Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
			});
		}

		if (member.id === interaction.user.id) {
			return interaction.editReply({
				content: 'Tu ne peux pas te donner un avertissement 😕',
			});
		}

		await warningsService.createWarning({
			discordId: member.id,
			warnedBy: interaction.user.id,
			reason: DEFAULT_REASON,
		});

		const dmResult = await warningsService.notifyMember(member, DEFAULT_REASON);
		let dmInfo = '';
		if (!dmResult.success && dmResult.errorMessage) {
			dmInfo = dmResult.errorMessage;
		}

		await interaction.targetMessage.delete().catch(() => null);

		return interaction.editReply({
			content: `⚠️ \`${member.user.tag}\` a reçu un avertissement\n\nRaison : ${DEFAULT_REASON}${dmInfo}`,
		});
	}
}
