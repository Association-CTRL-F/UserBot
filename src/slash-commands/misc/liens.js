import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('liens').setDescription('liens'),
	interaction: interaction => {
		const embed = new EmbedBuilder()
			.setColor('3366FF')
			.setTitle(
				"Bienvenue dans la bêta d'accès à notre service de raccourcissement des liens !",
			)
			.setDescription(
				`Ce programme nous permettra d'identifier les utilisations faites concernant ce service, mais aussi de l'améliorer pour le proposer par la suite à plus de membres.\n\nℹ️ **__INFOS__**\n\nVous avez désormais accès à la commande </affiliate:986666658804412515> sur notre bot, il vous suffit d'y entrer un lien long pour en obtenir un court sous le format \`https://lien.ctrl-f.io/hash\`\nVous allez également avoir accès d'ici peu à une extension développée en interne. Celle-ci est compatible avec Chrome, Edge, ainsi que Firefox.\nToutes les informations concernant son installation vous seront données.\n\nN'hésitez pas également à nous faire des retours, ou proposer des idées d'améliorations ! :wink:\n\n📌 **__LIENS__**\n\n<:ctrlf:905485049758093413> [Accès au site](https://lien.ctrl-f.io)`,
			)

		return interaction.channel.send({
			embeds: [embed],
		})
	},
}
