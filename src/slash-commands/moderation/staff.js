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
		switch (interaction.options.getSubcommand()) {
			case 'roles': {
				// Acquisition du membre
				const member = await interaction.guild.members
					.fetch(interaction.user.id)
					.catch(() => null)

				if (!member) {
					return interaction.reply({
						content: "Je n'ai pas trouvé ton profil sur le serveur 😕",
						flags: MessageFlags.Ephemeral,
					})
				}

				// Acquisition de la raison
				const reason = interaction.options.getString('raison').trim()

				// Acquisition des rôles à proposer
				const [staffEditeurs, modo, certifie] = await Promise.all([
					interaction.guild.roles.fetch(client.config.guild.roles.STAFF_EDITEURS_ROLE_ID),
					interaction.guild.roles.fetch(client.config.guild.roles.MODO_ROLE_ID),
					interaction.guild.roles.fetch(client.config.guild.roles.CERTIF_ROLE_ID),
				])

				if (!staffEditeurs || !modo || !certifie) {
					return interaction.reply({
						content: 'Impossible de récupérer un ou plusieurs rôles staff 😕',
						flags: MessageFlags.Ephemeral,
					})
				}

				const rolesArray = [staffEditeurs, modo, certifie]

				// Valeurs par défaut du menu
				const rolesArrayDefault = rolesArray.map((role) => ({
					label: role.name,
					value: role.id,
					default: member.roles.cache.has(role.id),
				}))

				// Création du menu
				const roles = new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('roles')
						.setPlaceholder('Sélectionnez les rôles souhaités')
						.setMinValues(1)
						.setMaxValues(3)
						.addOptions(rolesArrayDefault),
				)

				const message = await interaction.reply({
					components: [roles],
					flags: MessageFlags.Ephemeral,
					fetchReply: true,
				})

				client.cache.staffRolesReason.add({
					memberId: interaction.user.id,
					reason,
					message,
				})
			}
		}
	},
}
