/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('staff')
		.setDescription('Commandes staff')
		.addSubcommand(subcommand =>
			subcommand.setName('roles').setDescription('Choisir ses rôles staff'),
		),
	interaction: async (interaction, client) => {
		// Acquisition du membre
		const member = interaction.guild.members.cache.get(interaction.user.id)

		switch (interaction.options.getSubcommand()) {
			// Nouveau formulaire
			case 'roles':
				// Acquisition des rôles à proposer
				const staffEditeurs = await interaction.guild.roles.fetch(
					client.config.guild.roles.STAFF_EDITEURS_ROLE_ID,
				)
				const modo = await interaction.guild.roles.fetch(
					client.config.guild.roles.MODO_ROLE_ID,
				)
				const certifie = await interaction.guild.roles.fetch(
					client.config.guild.roles.CERTIF_ROLE_ID,
				)

				const rolesArray = [staffEditeurs, modo, certifie]

				// Valeur par défaut du menu
				const rolesArrayDefault = []
				rolesArray.forEach(role => {
					rolesArrayDefault.push({
						label: role.name,
						value: role.id,
						default: member.roles.cache.has(role.id),
					})
				})

				// Création du menu
				const roles = new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('roles')
						.setPlaceholder('Sélectionnez les rôles souhaités')
						.setMinValues(1)
						.setMaxValues(3)
						.addOptions(rolesArrayDefault),
				)

				return interaction.reply({
					components: [roles],
					ephemeral: true,
				})
		}
	},
}
