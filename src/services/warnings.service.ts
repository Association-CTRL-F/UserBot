import type { Warning } from '#database/index';
import { FormsRepository, WarningsRepository } from '#repository/index';
import { EmbedBuilder, type GuildMember } from 'discord.js';

type CreateWarningOptions = {
	discordId: string;
	warnedBy: string;
	reason: string;
	proofUrl?: string | null;
	timestamp?: Date;
};

type NotifyResult = {
	success: boolean;
	errorMessage?: string;
};

const DEFAULT_WARN_DM =
	'Tu as reçu un avertissement de la part de notre équipe de modération.';

export class WarningsService {
	public async createWarning({
		discordId,
		warnedBy,
		reason,
		proofUrl = null,
		timestamp = new Date(),
	}: CreateWarningOptions): Promise<Warning> {
		return await WarningsRepository.create({
			discordID: discordId,
			warnedBy,
			warnReason: reason,
			warnPreuve: proofUrl,
			warnedAt: timestamp.toISOString(),
		});
	}

	public async notifyMember(
		member: GuildMember,
		reason: string
	): Promise<NotifyResult> {
		const template = await FormsRepository.findByName('warn');
		const text = template?.content ?? DEFAULT_WARN_DM;

		const embed = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Avertissement')
			.setDescription(text)
			.addFields({ name: 'Raison', value: reason });

		try {
			await member.send({ embeds: [embed] });
			return { success: true };
		} catch (error) {
			return {
				success: false,
				errorMessage:
					"\n\nℹ️ Le message privé n'a pas été envoyé car le membre les a bloqué",
			};
		}
	}
}

export const warningsService = new WarningsService();
