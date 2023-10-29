import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('bvn').setDescription('bvn'),
	interaction: interaction => {
		const embed = new EmbedBuilder()
			.setColor('3366FF')
			.setTitle("Bienvenue sur le serveur d'Entraide informatique - Capetlevrai !")
			.setDescription(
				`Première communauté francophone d'entraide et de conseils informatique !\nVenez apprendre et partager vos connaissances.\n\nDe l'informatique à la mécanique, tout en passant par des évènements rassemblant différentes communautés de passionnés, notre serveur offre un vaste choix de domaines de compétences, et vous laisse la possibilité d'interagir uniquement avec ce que vous préférez.\n\nℹ️ **__INFOS PRATIQUES__**\n\nUne fois le règlement validé, vous pouvez définir vos accès selon vos envies. Pour cela il faut vous rendre tout en haut de la liste des salons, dans l'onglet <id:customize>. Vous pourrez ainsi choisir les rôles que vous souhaitez !\n\nN'hésitez pas également à visiter notre <id:guide> ainsi que notre <#768173879087726643> pour obtenir des réponses à vos questions sur le serveur.\n\n📌 **__SUIVRE CAPET__**\n\n<:youtube:1095475065463783576> [YouTube](https://youtube.com/capetlevrai)\r<:twitch:1095475093104246944> [Twitch](https://twitch.tv/capetlevrai)\r<:x_twitter:1167515658494427267> [X](https://x.com/capetlevrai)`,
			)

		return interaction.channel.send({
			embeds: [embed],
			files: [`./config/bvn.png`],
		})
	},
}
