import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('faq').setDescription('faq'),
	interaction: (interaction) => {
		const file = new AttachmentBuilder('./config/faq.png', { name: 'faq.png' })

		const embed = new EmbedBuilder()
			.setColor(0x3366ff)
			.setDescription(
				`🛡️ **__Les différents rôles du staff__**\n\n<@&475406297127452673> - Leaders de l'équipe de modération. Ils veillent à acter des décisions proposées par l'équipe de modération mais aussi l'équipe de certifiés ainsi que de trancher en cas d'indécisions. Ils s'occupent du serveur et de son fonctionnement.\n\n<@&475410429347233792> - Ils représentent l'image de la modération du Discord, tant au sein du serveur qu'à l'extérieur. Ils doivent faire preuve d'impartialité dans les échanges et veiller au bon fonctionnement du Discord. Ils s'occupent de la gestion quotidienne et sanctionnent lorsqu'il y a besoin.\n\n<@&475412267844894722> - Ils représentent l'image de la qualité technique du Discord, tant au sein du serveur qu'à l'extérieur. Ils peuvent modérer en cas de problème mineur ou d'absence de modérateur. Ils s'occupent quotidiennement de l'aspect technique des diverses catégories.\n\n<@&481551733097627652> - Ils font parti des membres qui sortent du lot par leur volonté d'aider et de faire du serveur un lieu de partage. Ils n'ont pas nécessairement des compétences poussées mais ils sont volontaires et actifs.\n\n<@&768221452008554516> - Il s'agit des membres les plus actifs et qui respectent le règlement.\n\n<@&615976083908591764> - Il s'agit des membres qui ont boosté le serveur via leur abonnement Nitro. Merci à eux !\n\n<@&476445477039112218> - Il s'agit des membres sanctionnés, ils ne peuvent plus écrire dans l'ensemble des salons, excepté le salon médiation, afin de pouvoir communiquer exclusivement avec l'équipe de modération.`,
			)
			.setImage('attachment://faq.png')

		const embed1 = new EmbedBuilder()
			.setColor(0x3366ff)
			.setDescription(`❔ **__Les questions courantes__**`)
			.addFields(
				{
					name: 'Q : "Je n\'ai pas accès à tous les salons, est-ce normal ?"',
					value: 'R : Vous avez accès au salon <id:customize> qui vous permet de sélectionner les catégories supplémentaires qui vous intéressent !',
					inline: false,
				},
				{
					name: 'Q : "Un membre a un comportement inapproprié, que puis-je faire ?"',
					value: 'R : Afin de faciliter la modération, nous avons mis en place un système de signalements, il vous suffit de réagir à un message allant à l\'encontre des règles avec 🚨 ou en réalisant un clic droit > "Apps" > "signaler". Bien sûr, tout abus de cette fonctionnalité sera sanctionné.',
					inline: false,
				},
				{
					name: 'Q : "Je ne peux plus écrire dans les salons, que se passe-t-il ?"',
					value: "R : Si vous ne pouvez plus écrire dans tous les salons publics, c'est que vous avez été sanctionné d'un mute. Un canal tribunal vous sera alors accessible pour vous expliquer avec la modération.",
					inline: false,
				},
				{
					name: 'Q : "J\'aimerai faire remonter un problème au niveau du serveur ou proposer des améliorations, qui dois-je contacter ?"',
					value: 'R : Pour éviter les messages privés et centraliser ces messages à la vue de tous, il faudra les poster dans le salon <#1036644757524451478> prévu à cet effet.',
					inline: false,
				},
				{
					name: 'Q : "Un ami est banni et souhaite faire une demande de levée de bannissement, comment faire ?"',
					value: "R : Afin de laisser une seconde chance aux membres bannis, nous avons mis en place un formulaire de levée de bannissement disponible à l'adresse https://moderation.ctrl-f.info\nLes conditions de levée y sont indiquées, ainsi que la mise en garde si le résultat de la demande est positif.",
					inline: false,
				},
			)

		return interaction.reply({
			embeds: [embed, embed1],
			files: [file],
		})
	},
}
