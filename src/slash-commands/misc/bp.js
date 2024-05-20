/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	ActionRowBuilder,
	TextInputStyle,
} from 'discord.js'
import fetch from 'node-fetch'

export default {
	data: new SlashCommandBuilder().setName('bp').setDescription('Crée un bon-plan'),
	interaction: async (interaction, client) => {
		const modalCreate = new ModalBuilder()
			.setCustomId('bp')
			.setTitle('Création de bon-plan')
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('bp-titre')
						.setLabel('Donnez un titre à votre bon-plan')
						.setStyle(TextInputStyle.Short)
						.setMinLength(1)
						.setRequired(true),
				),
			)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('bp-description')
						.setLabel('Donnez une description courte du bon-plan')
						.setStyle(TextInputStyle.Short)
						.setMinLength(1)
						.setRequired(true),
				),
			)
			.addComponents(
				new ActionRowBuilder().addComponents(
					new TextInputBuilder()
						.setCustomId('bp-lien')
						.setLabel('Donnez le lien du bon-plan')
						.setStyle(TextInputStyle.Short)
						.setMinLength(1)
						.setRequired(true),
				),
			)

		return interaction.showModal(modalCreate)
	},
}
