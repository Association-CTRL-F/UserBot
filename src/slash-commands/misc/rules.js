import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder().setName('rules').setDescription('rules'),
	interaction: async interaction => {
		const embed = new EmbedBuilder()
			.setColor('3366FF')
			.setDescription(
				`📃 **__Règles générales__**\n\n0️⃣ - Vous devez respecter les Conditions Générales d'Utilisation de Discord. En effet, le serveur fait partie du programme Communauté, nous avons donc l'obligation de respecter et faire respecter ces CGU. Dans le but de garantir une modération efficace, sachez que l'ensemble des messages y compris ceux modifiés ou supprimés sont conservés indéfiniment dans des logs privés.\n\n1️⃣ - Chaque personne, indépendamment de son grade et de ses compétences mérite du respect. Aucun comportement néfaste, immature ou désobligeant ne sera toléré. De même, toute discrimination, racisme, harcèlement, promotion de haine, insultes sévères ou provocation à la suite d'un avertissement (message, vocal, pseudo ou encore photo de profil) ou tout autre propos pouvant aller à l'encontre d'une personne sont strictement interdits et sévèrement punis.\n\n2️⃣ - Vous êtes l'unique responsable de vos choix et de vos actions. En aucun cas un autre membre ne pourra être tenu responsable, ni le serveur et son équipe.\n\n3️⃣ - Afin de faciliter la communication, un effort sur votre écriture est demandé. Le langage SMS est proscrit, de même que le spam, le flood et l'abus de majuscules ou de caractères spéciaux. Il est à noter que l'informatique est un domaine dont les sources partagées sont majoritairement en anglais, si vous n'êtes pas à l'aise avec cette langue, nous vous conseillons d'utiliser un traducteur tel que Deepl (https://www.deepl.com/fr/translator).\n\n4️⃣ - Dans un souci de clarté, les caractères spéciaux en début ou dans le pseudo sont interdits, votre pseudo doit être composé uniquement de lettres permettant de vous mentionner en écrivant @pseudo. Notre bot scan automatiquement les pseudos et vous renommera le cas échéant. Vous devez également présenter une photo de profil convenable, les PP invisibles sont interdites.\n\n5️⃣ - Veuillez éviter les interventions inutiles qui n'apportent rien à la discussion. Les réactions sont acceptées si leur utilisation n'est pas abusive ou à l'encontre des règles précédentes. De même, merci de ne pas supprimer vos messages afin de garder une lisibilité dans les conversations.\n\n6️⃣ - Lorsque vous voulez partager un fichier ou logiciel, préférez donner le lien vers le site officiel ou toute autre source sûre plutôt que de l'envoyer directement. Nous ne remettons pas en doute votre bienveillance mais il n'est pas forcément possible de vérifier le contenu et d'en assurer la fiabilité auprès des autres membres.\n\n7️⃣ - Par précaution et pour différentes raisons, nous interdisons le double compte sur le serveur. Cela vaut un bannissement du compte le plus jeune, voir des 2 comptes en fonction de la situation.`,
			)

		const embed1 = new EmbedBuilder()
			.setColor('3366FF')
			.setDescription(
				`📨 **__Règles salons__**\n\n8️⃣ - Afin de vous permettre une discussion limpide, nous avons mis à votre disposition de nombreux salons de discussions dont les accès vous sont automatiquement donnés par le bot dans <id:customize>. Ainsi, veuillez lire attentivement le nom des salons du serveur et poster uniquement dans celui qui convient. Cet effort doit être fait afin de classer et de simplifier la navigation sur le serveur. Si vous avez un doute, le salon <#475254109386178581> est celui par défaut.\rEn aucun cas vous devez poster plusieurs fois votre problème dans les différents salons.\rPour les commandes du bot, veuillez les utiliser dans le salon approprié <#698938415286321183> lorsque cela est possible (hors commandes d'aide).\n\n9️⃣ - Tous sujets illégaux, frauduleux, politiques ou religieux sont interdits. De même, toutes les formes de publicité (liens de parrainage, invitation vers d'autres serveurs, etc) sont interdites SAUF autorisation au préalable de la modération. Tout message ne respectant pas cette règle sera supprimé et son auteur sanctionné.\n\n🇦 - Merci de ne pas ping les administrateurs, modérateurs et certifiés. Si vous avez une requête à soumettre, veuillez contacter la modération en privé. Tout abus sera sanctionné. Si vous connaissez une situation d'urgence, préférez contacter un professionnel.\n\n🇧 - Les opinions personnelles sur une marque ne sont pas tolérées lorsqu'il s'agit d'aider ou de débattre sur l'aspect technique d'un composant. En effet, seuls les arguments constructifs basés sur des sources de qualité seront acceptés dans le but de garder un espace sérieux et pertinent.`,
			)

		const embed2 = new EmbedBuilder()
			.setColor('3366FF')
			.setDescription(
				`📝 **__Règles entraide__**\n\n🇨 - L'utilisateur est le seul responsable d'une intervention sur son PC. Ni le serveur Discord ou son équipe ni aucun autre membre ne pourra être tenu responsable de l'aggravation ou de la génération d'un problème. Si vous souhaitez des garanties, nous vous prions de bien vouloir vous diriger vers un professionnel.\n\n🇩 - Afin que les autres membres puissent vous aider au mieux, veuillez être précis : une description du problème (messages d'erreurs, jeu/logiciel qui ne fonctionne pas, etc.) et des renseignements sur le système (configuration, version de Windows, optimisations effectuées etc.) ainsi que les manipulations effectuées avant que le problème ne survienne permettront de donner toutes les informations nécessaires. De même lorsque vous demandez de l'aide, veuillez avoir un accès au pc problématique.\n\n🇪 - Lorsque vous demandez de l'aide pour une configuration ou une upgrade, nous vous demandons de remplir un formulaire afin de connaître le plus précisément possible vos besoins et vos attentes. Si vous avez un doute ou une question sur l'un des points demandés, n'hésitez pas à nous le communiquer.\rDe même, les membres qui vous proposerons des solutions passent du temps à rechercher le meilleur rapport qualité/prix sur-mesure et optimisé à ce que vous avez indiqué, c'est pourquoi nous sanctionnerons tout abus et troll.\n\n🇫 - Seuls les sites sécurisés seront utilisés dans les propositions. Pour des raisons de responsabilité, ni l'occasion ni la vente entre membre n'est autorisé.\n\n🇬 - Afin de garder une bonne lisibilité des salons d'entraide, veuillez formuler des messages complets. De même, si votre message n'a pas été vu, préférez le citer via le bot plutôt que remplir un nouveau questionnaire.`,
			)

		const embed3 = new EmbedBuilder()
			.setColor('3366FF')
			.setDescription(
				`👮 **__Sanctions__**\n\nLes actions et sanctions que l'équipe de modération peut appliquer sont les suivantes :\n\n➡️ Le slowmode : si un salon est soumis à une trop grande activité, un temps d'attente entre chaque message peut être instauré afin de la canaliser.\n\n➡️ Le mute : l'ensemble des salons est alors en lecture seule, vous ne pouvez plus écrire à l'exception du salon médiation où vous pouvez entrer en communication avec le staff.\n\n➡️ L'avertissement : que vous recevez en privé via notre bot. Des précisions sur la raison et la partie du règlement enfreinte y sont jointes.\n\n➡️ Le bannissement : lorsque vous avez reçu 4 avertissements, ou que votre comportement a été trop néfaste, nous vous excluons du serveur avec une interdiction de revenir pour une durée déterminée ou non.\n\nHors situations exceptionnelles, si vous avez plusieurs mutes rapprochés ou que commettez une faute grave, vous serez sanctionné par un avertissement.\n\nSachez que l'équipe de modération se réserve le droit de sanctionner un comportement qui ne respecterait pas la bienséance et le savoir-vivre, même si celui-ci ne va pas à l'encontre de l'une des parties de ce présent règlement.\n\nIl est inutile de contester en privé une sanction à l'un des administrateurs ou l'un des modérateurs.`,
			)
			.setFooter({
				text: `Mise à jour le 13 janvier 2024`,
			})

		await interaction.channel.send({
			embeds: [embed],
			files: [`./config/rules.png`],
		})

		await interaction.channel.send({
			embeds: [embed1],
		})

		await interaction.channel.send({
			embeds: [embed2],
		})

		return interaction.channel.send({
			embeds: [embed3],
		})
	},
}
