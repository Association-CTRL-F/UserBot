import {
	SlashCommandBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	MessageFlags,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('staff')
		.setDescription('Commandes staff')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('roles')
				.setDescription('Choisir ses rôles staff')
				.addStringOption((option) =>
					option
						.setName('raison')
						.setDescription('Raison de la modification des rôles')
						.setRequired(true),
				),
		),

	interaction: async (interaction, client) => {
		const member = interaction.guild.members.cache.get(interaction.user.id)

		switch (interaction.options.getSubcommand()) {
			case 'roles': {
				const reason = interaction.options.getString('raison')

				const [staffEditeurs, modo, certifie] = await Promise.all([
					interaction.guild.roles.fetch(client.config.guild.roles.STAFF_EDITEURS_ROLE_ID),
					interaction.guild.roles.fetch(client.config.guild.roles.MODO_ROLE_ID),
					interaction.guild.roles.fetch(client.config.guild.roles.CERTIF_ROLE_ID),
				])

				if (!staffEditeurs || !modo || !certifie) {
					return interaction.reply({
						content: 'Impossible de récupérer un ou plusieurs rôles 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				const rolesArrayDefault = [staffEditeurs, modo, certifie].map((role) => ({
					label: role.name,
					value: role.id,
					default: member.roles.cache.has(role.id),
				}))

				const roles = new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('roles')
						.setPlaceholder('Sélectionnez les rôles souhaités')
						.setMinValues(1)
						.setMaxValues(3)
						.addOptions(rolesArrayDefault),
				)

				await interaction.reply({
					components: [roles],
					flags: MessageFlags.Ephemeral,
				})

				if (!(client.cache.staffRolesReason instanceof Map)) {
					client.cache.staffRolesReason = new Map()
				}

				client.cache.staffRolesReason.set(interaction.user.id, {
					reason,
					interaction,
				})
			}
		}
	},
}
