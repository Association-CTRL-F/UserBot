import {
	Collection,
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	RESTJSONErrorCodes,
	PermissionsBitField,
	AttachmentBuilder,
} from 'discord.js'
import { createHash } from 'node:crypto'
import {
	modifyWrongUsernames,
	convertDate,
	isImage,
	getFileInfos,
	displayNameAndID,
} from '../../util/util.js'
import { ChatGPTAPI } from 'chatgpt'
import bent from 'bent'

const SPAM_WINDOW_MS = 10 * 60 * 1000
const SPAM_MIN_MESSAGES = 3
const SPAM_MIN_CHANNELS = 3
const SPAM_TRACK_LIMIT = 25
const SPAM_TIMEOUT_MS = 12 * 60 * 60 * 1000

// Texte fuzzy / suffixes random
const SPAM_SIMILARITY_THRESHOLD = 0.84
const SPAM_PREFIX_SIMILARITY_THRESHOLD = 0.78
const SPAM_TOKEN_SIMILARITY_THRESHOLD = 0.78
const SPAM_PREFIX_MIN_CHARS = 30
const SPAM_FUZZY_MIN_CHARS = 25
const SPAM_RANDOM_STRIP_MIN_CHARS = 8
const SPAM_RANDOM_SUFFIX_MAX_TOKENS = 4
const SPAM_TOKEN_MIN_MATCHES = 4

// Correction du premier test : même texte + fin random différente
const SPAM_TAIL_NOISE_MAX_TOKENS = 4
const SPAM_TAIL_NOISE_MAX_CHARS = 40
const SPAM_STABLE_CORE_MIN_CHARS = 14
const SPAM_STABLE_CORE_MIN_TOKENS = 2

// Pièces jointes / images
const SPAM_ATTACHMENT_HASH_MAX_BYTES = 8 * 1024 * 1024
const SPAM_ATTACHMENT_ANALYSIS_CACHE_LIMIT = 500
const SPAM_ATTACHMENT_OVERLAP_THRESHOLD = 0.66

// Détection visuelle optionnelle avec sharp
const SPAM_IMAGE_VISUAL_HASH_SIZE = 16
const SPAM_IMAGE_VISUAL_HASH_MAX_DISTANCE = 28

// Albums / bursts média
const SPAM_ALBUM_MIN_IMAGES = 2
const SPAM_ALBUM_BURST_SCORE = 0.82
const SPAM_MEDIA_BURST_SCORE = 0.72

// Texte faible / random avec image
const SPAM_LOW_SIGNAL_TEXT_MAX_CHARS = 40
const SPAM_LOW_SIGNAL_TEXT_MAX_TOKENS = 4
const SPAM_LOW_SIGNAL_RANDOM_RATIO = 0.75

const attachmentAnalysisCache = new Map()
let sharpLoader = null

const getSharp = async () => {
	if (!sharpLoader) {
		sharpLoader = import('sharp').then((module) => module.default ?? module).catch(() => null)
	}

	return sharpLoader
}

const getLinkBuffer = (url) => {
	const getBuffer = bent('buffer')
	return getBuffer(url)
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const truncateText = (value, max = 1000) => {
	if (!value || !value.trim()) return '[Aucun contenu texte]'

	const escaped = value.replace(/```/g, '\\`\\`\\`')
	if (escaped.length <= max) return escaped

	return `${escaped.slice(0, max - 6)} [...]`
}

const normalizeSpamText = (value = '') =>
	value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/\p{Cf}/gu, '')
		.toLowerCase()
		.replace(/https?:\/\/[^\s]+/gi, '<url>')
		.replace(/\bdiscord(?:\.gg|(?:app)?\.com\/invite)\/[a-z0-9-]+/gi, '<invite>')
		.replace(/\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/gi, '<url>')
		.replace(/<@!?\d+>/g, '<mention>')
		.replace(/<#\d+>/g, '<channel>')
		.replace(/<@&\d+>/g, '<role>')
		.replace(/```/g, '')
		.replace(/[^\p{L}\p{N}\s<>_-]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()

const getBufferHash = (buffer) => createHash('sha256').update(buffer).digest('hex')

const getImageVisualHash = async (buffer) => {
	const sharp = await getSharp()
	if (!sharp) return null

	const pixels = await sharp(buffer)
		.resize(SPAM_IMAGE_VISUAL_HASH_SIZE, SPAM_IMAGE_VISUAL_HASH_SIZE, {
			fit: 'fill',
		})
		.greyscale()
		.raw()
		.toBuffer()
		.catch(() => null)

	if (!pixels?.length) return null

	const average = [...pixels].reduce((sum, value) => sum + value, 0) / pixels.length

	return [...pixels].map((value) => (value >= average ? '1' : '0')).join('')
}

const getHammingDistance = (a, b) => {
	if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY

	let distance = 0

	for (let index = 0; index < a.length; index += 1) {
		if (a[index] !== b[index]) distance += 1
	}

	return distance
}

const isImageAttachment = (attachment) => {
	const name = attachment.name ?? ''
	const contentType = attachment.contentType ?? ''

	return contentType.toLowerCase().startsWith('image/') || isImage(name)
}

const canHashAttachment = (attachment) => {
	const size = Number(attachment.size ?? 0)

	if (size > SPAM_ATTACHMENT_HASH_MAX_BYTES) return false

	return Boolean(attachment.proxyURL ?? attachment.url)
}

const setAttachmentAnalysisCache = (key, value) => {
	if (!key) return

	if (attachmentAnalysisCache.size >= SPAM_ATTACHMENT_ANALYSIS_CACHE_LIMIT) {
		const oldestKey = attachmentAnalysisCache.keys().next().value
		if (oldestKey) attachmentAnalysisCache.delete(oldestKey)
	}

	attachmentAnalysisCache.set(key, value)
}

const analyzeAttachment = async (attachment) => {
	const size = Number(attachment.size ?? 0)
	const contentType = (attachment.contentType ?? 'unknown').toLowerCase()
	const width = attachment.width ?? 0
	const height = attachment.height ?? 0
	const image = isImageAttachment(attachment)
	const kind = image ? 'image' : 'file'
	const url = attachment.proxyURL ?? attachment.url
	const cacheKey = url ? `${url}:${size}:${contentType}` : null

	if (cacheKey && attachmentAnalysisCache.has(cacheKey)) {
		return attachmentAnalysisCache.get(cacheKey)
	}

	const metaFingerprint = `${kind}-meta:${size}:${contentType}:${width}:${height}`

	let result = null

	if (canHashAttachment(attachment)) {
		const buffer = await getLinkBuffer(url).catch(() => null)

		if (buffer) {
			const exactHash = getBufferHash(buffer)
			const visualHash = image ? await getImageVisualHash(buffer) : null

			result = {
				fingerprint: `${kind}-hash:${exactHash}`,
				exactHash,
				metaFingerprint,
				visualHash,
				isImage: image,
				strength: 'hash',
			}
		}
	}

	if (!result) {
		result = {
			fingerprint: metaFingerprint,
			exactHash: null,
			metaFingerprint,
			visualHash: null,
			isImage: image,
			strength: 'meta',
		}
	}

	setAttachmentAnalysisCache(cacheKey, result)

	return result
}

const getAttachmentAnalysis = async (attachments) => {
	const analyses = await Promise.all(
		[...attachments.values()].map((attachment) => analyzeAttachment(attachment)),
	)

	const fingerprints = analyses
		.map((analysis) => analysis.fingerprint)
		.filter(Boolean)
		.sort()

	const exactHashes = analyses
		.map((analysis) => analysis.exactHash)
		.filter(Boolean)
		.sort()

	const metaFingerprints = analyses
		.map((analysis) => analysis.metaFingerprint)
		.filter(Boolean)
		.sort()

	const visualHashes = analyses
		.filter((analysis) => analysis.isImage && analysis.visualHash)
		.map((analysis) => analysis.visualHash)

	const imageAttachmentCount = analyses.filter((analysis) => analysis.isImage).length

	return {
		fingerprints,
		exactHashes,
		metaFingerprints,
		signature: fingerprints.join('|'),
		metaSignature: metaFingerprints.join('|'),
		visualHashes,
		attachmentCount: analyses.length,
		imageAttachmentCount,
		nonImageAttachmentCount: analyses.length - imageAttachmentCount,
	}
}

const normalizeSpamPayload = async (message) => {
	const attachmentAnalysis = await getAttachmentAnalysis(message.attachments)

	return {
		text: normalizeSpamText(message.content ?? ''),
		attachmentFingerprints: attachmentAnalysis.fingerprints,
		attachmentExactHashes: attachmentAnalysis.exactHashes,
		attachmentMetaFingerprints: attachmentAnalysis.metaFingerprints,
		attachmentSignature: attachmentAnalysis.signature,
		attachmentMetaSignature: attachmentAnalysis.metaSignature,
		imageVisualHashes: attachmentAnalysis.visualHashes,
		attachmentCount: attachmentAnalysis.attachmentCount,
		imageAttachmentCount: attachmentAnalysis.imageAttachmentCount,
		nonImageAttachmentCount: attachmentAnalysis.nonImageAttachmentCount,
		hasAttachments: attachmentAnalysis.attachmentCount > 0,
		hasImageAttachments: attachmentAnalysis.imageAttachmentCount > 0,
	}
}

const getCommonPrefixLength = (a, b) => {
	const minLength = Math.min(a.length, b.length)

	let index = 0
	while (index < minLength && a[index] === b[index]) {
		index += 1
	}

	return index
}

const getNgramSimilarity = (a, b, size = 3) => {
	if (a === b) return 1

	const charsA = Array.from(a)
	const charsB = Array.from(b)

	if (charsA.length < size || charsB.length < size) return 0

	const getNgrams = (chars) => {
		const ngrams = new Map()

		for (let index = 0; index <= chars.length - size; index += 1) {
			const ngram = chars.slice(index, index + size).join('')
			ngrams.set(ngram, (ngrams.get(ngram) ?? 0) + 1)
		}

		return ngrams
	}

	const ngramsA = getNgrams(charsA)
	const ngramsB = getNgrams(charsB)

	let intersection = 0

	for (const [ngram, countA] of ngramsA) {
		const countB = ngramsB.get(ngram) ?? 0
		intersection += Math.min(countA, countB)
	}

	const total =
		[...ngramsA.values()].reduce((sum, count) => sum + count, 0) +
		[...ngramsB.values()].reduce((sum, count) => sum + count, 0)

	return total === 0 ? 0 : (2 * intersection) / total
}

const getTokenContainmentScore = (a, b) => {
	const tokensA = new Set(a.split(' ').filter((token) => token.length > 2))
	const tokensB = new Set(b.split(' ').filter((token) => token.length > 2))

	const minSize = Math.min(tokensA.size, tokensB.size)
	if (minSize < SPAM_TOKEN_MIN_MATCHES) return 0

	let common = 0

	for (const token of tokensA) {
		if (tokensB.has(token)) common += 1
	}

	return common / minSize
}

const isLikelyRandomToken = (token) => {
	const clean = token.replace(/[^\p{L}\p{N}_-]/gu, '')

	if (clean.length < 5) return false

	const hasLetter = /\p{L}/u.test(clean)
	const hasDigit = /\p{N}/u.test(clean)
	const onlyLetters = /^[\p{L}]+$/u.test(clean)

	const uniqueChars = new Set(Array.from(clean)).size
	const uniqueRatio = uniqueChars / clean.length

	const vowels = clean.match(/[aeiouy]/gi)?.length ?? 0
	const vowelRatio = vowels / clean.length

	if (hasLetter && hasDigit && clean.length >= 5) return true
	if (onlyLetters && clean.length >= 5 && vowelRatio <= 0.15) return true
	if (clean.length >= 8 && uniqueRatio >= 0.7 && vowelRatio <= 0.35) return true
	if (clean.length >= 12 && uniqueRatio >= 0.75) return true

	return false
}

const stripTrailingRandomTokens = (text) => {
	const tokens = text.split(' ')
	let removed = 0

	while (
		tokens.length > 1 &&
		removed < SPAM_RANDOM_SUFFIX_MAX_TOKENS &&
		isLikelyRandomToken(tokens[tokens.length - 1])
	) {
		tokens.pop()
		removed += 1
	}

	return tokens.join(' ').trim()
}

const getTextTailVariants = (text) => {
	const tokens = text.split(' ').filter(Boolean)
	const variants = new Set()

	if (!tokens.length) return variants

	for (let removeCount = 1; removeCount <= SPAM_TAIL_NOISE_MAX_TOKENS; removeCount += 1) {
		if (tokens.length <= removeCount) break

		const coreTokens = tokens.slice(0, -removeCount)
		const tailTokens = tokens.slice(-removeCount)

		const core = coreTokens.join(' ').trim()
		const tail = tailTokens.join(' ').trim()

		if (!core || !tail) continue
		if (core.length < SPAM_STABLE_CORE_MIN_CHARS) continue
		if (coreTokens.length < SPAM_STABLE_CORE_MIN_TOKENS) continue
		if (tail.length > SPAM_TAIL_NOISE_MAX_CHARS) continue

		variants.add(core)
	}

	return variants
}

const getTailNoiseInsensitiveTextMatch = (a, b) => {
	const variantsA = getTextTailVariants(a)
	const variantsB = getTextTailVariants(b)

	for (const variantA of variantsA) {
		if (variantsB.has(variantA)) {
			return {
				match: true,
				score: 0.96,
				reason: 'same_text_random_tail',
			}
		}
	}

	return {
		match: false,
		score: 0,
		reason: 'different_tail_core',
	}
}

const isPlaceholderSpamToken = (token) =>
	['<url>', '<invite>', '<mention>', '<channel>', '<role>'].includes(token)

const isLowSignalSpamText = (text = '') => {
	const normalized = text.trim()

	if (!normalized) return true

	const tokens = normalized.split(' ').filter(Boolean)

	if (!tokens.length) return true

	if (
		normalized.length <= SPAM_LOW_SIGNAL_TEXT_MAX_CHARS &&
		tokens.length <= SPAM_LOW_SIGNAL_TEXT_MAX_TOKENS
	) {
		return true
	}

	const weakTokens = tokens.filter((token) => {
		const clean = token.replace(/[^\p{L}\p{N}_<>_-]/gu, '')

		if (!clean) return true
		if (clean.length <= 2) return true
		if (isPlaceholderSpamToken(clean)) return true
		if (isLikelyRandomToken(clean)) return true

		return false
	})

	return weakTokens.length / tokens.length >= SPAM_LOW_SIGNAL_RANDOM_RATIO
}

const getSpamTextSimilarity = (a, b) => {
	if (!a || !b) {
		return {
			match: false,
			score: 0,
			reason: 'empty_text',
		}
	}

	if (a === b) {
		return {
			match: true,
			score: 1,
			reason: 'exact_text',
		}
	}

	const strippedA = stripTrailingRandomTokens(a)
	const strippedB = stripTrailingRandomTokens(b)

	if (
		strippedA &&
		strippedA === strippedB &&
		strippedA.length >= SPAM_RANDOM_STRIP_MIN_CHARS &&
		strippedA.split(' ').length >= 2
	) {
		return {
			match: true,
			score: 1,
			reason: 'random_suffix',
		}
	}

	const tailNoiseMatch = getTailNoiseInsensitiveTextMatch(a, b)
	if (tailNoiseMatch.match) {
		return tailNoiseMatch
	}

	const minLength = Math.min(a.length, b.length)

	if (minLength < SPAM_FUZZY_MIN_CHARS) {
		return {
			match: false,
			score: 0,
			reason: 'too_short_for_fuzzy',
		}
	}

	const prefixLength = getCommonPrefixLength(a, b)
	const prefixScore = prefixLength / minLength
	const ngramScore = getNgramSimilarity(a, b)
	const tokenScore = getTokenContainmentScore(a, b)

	const score = Math.max(prefixScore, ngramScore, tokenScore)

	const prefixMatch =
		prefixLength >= SPAM_PREFIX_MIN_CHARS && prefixScore >= SPAM_PREFIX_SIMILARITY_THRESHOLD

	const fuzzyMatch = score >= SPAM_SIMILARITY_THRESHOLD
	const tokenMatch = tokenScore >= SPAM_TOKEN_SIMILARITY_THRESHOLD

	return {
		match: prefixMatch || fuzzyMatch || tokenMatch,
		score,
		reason: prefixMatch
			? 'same_prefix'
			: tokenMatch
				? 'same_tokens'
				: fuzzyMatch
					? 'fuzzy_text'
					: 'different_text',
	}
}

const getBagOverlapScore = (valuesA = [], valuesB = []) => {
	const mapA = new Map()
	const mapB = new Map()

	for (const value of valuesA.filter(Boolean)) {
		mapA.set(value, (mapA.get(value) ?? 0) + 1)
	}

	for (const value of valuesB.filter(Boolean)) {
		mapB.set(value, (mapB.get(value) ?? 0) + 1)
	}

	const countA = [...mapA.values()].reduce((sum, value) => sum + value, 0)
	const countB = [...mapB.values()].reduce((sum, value) => sum + value, 0)
	const minSize = Math.min(countA, countB)

	if (!minSize) return 0

	let common = 0

	for (const [value, countAValue] of mapA) {
		common += Math.min(countAValue, mapB.get(value) ?? 0)
	}

	return common / minSize
}

const getSharedExactAttachmentMatch = (a, b) => {
	const exactScore = getBagOverlapScore(a.attachmentExactHashes, b.attachmentExactHashes)

	if (exactScore > 0) {
		return {
			match: true,
			score: exactScore,
			reason: 'same_attachment_hash',
		}
	}

	return {
		match: false,
		score: 0,
		reason: 'no_shared_attachment_hash',
	}
}

const getVisualImageMatch = (a, b) => {
	const visualHashesA = a.imageVisualHashes ?? []
	const visualHashesB = b.imageVisualHashes ?? []

	for (const visualHashA of visualHashesA) {
		for (const visualHashB of visualHashesB) {
			const distance = getHammingDistance(visualHashA, visualHashB)

			if (distance <= SPAM_IMAGE_VISUAL_HASH_MAX_DISTANCE) {
				return {
					match: true,
					score: 1 - distance / visualHashA.length,
					reason: 'similar_image_visual_hash',
				}
			}
		}
	}

	return {
		match: false,
		score: 0,
		reason: 'different_images',
	}
}

const getAttachmentAlbumOverlapMatch = (a, b) => {
	const minImages = Math.min(a.imageAttachmentCount ?? 0, b.imageAttachmentCount ?? 0)

	if (minImages < SPAM_ALBUM_MIN_IMAGES) {
		return {
			match: false,
			score: 0,
			reason: 'not_album',
		}
	}

	const exactScore = getBagOverlapScore(a.attachmentExactHashes, b.attachmentExactHashes)

	if (exactScore >= SPAM_ATTACHMENT_OVERLAP_THRESHOLD) {
		return {
			match: true,
			score: exactScore,
			reason: a.text !== b.text ? 'same_image_album_random_text' : 'same_image_album',
		}
	}

	const metaScore = getBagOverlapScore(a.attachmentMetaFingerprints, b.attachmentMetaFingerprints)

	if (
		a.imageAttachmentCount === b.imageAttachmentCount &&
		metaScore >= SPAM_ATTACHMENT_OVERLAP_THRESHOLD
	) {
		return {
			match: true,
			score: Math.min(metaScore, 0.86),
			reason: a.text !== b.text ? 'same_album_metadata_random_text' : 'same_album_metadata',
		}
	}

	return {
		match: false,
		score: 0,
		reason: 'different_album',
	}
}

const getVisualAlbumOverlapMatch = (a, b) => {
	const visualHashesA = [...(a.imageVisualHashes ?? [])]
	const visualHashesB = [...(b.imageVisualHashes ?? [])]

	const minSize = Math.min(visualHashesA.length, visualHashesB.length)

	if (minSize < SPAM_ALBUM_MIN_IMAGES) {
		return {
			match: false,
			score: 0,
			reason: 'not_visual_album',
		}
	}

	let matches = 0
	const usedB = new Set()

	for (const visualHashA of visualHashesA) {
		let bestIndex = -1
		let bestDistance = Number.POSITIVE_INFINITY

		for (let index = 0; index < visualHashesB.length; index += 1) {
			if (usedB.has(index)) continue

			const distance = getHammingDistance(visualHashA, visualHashesB[index])

			if (distance < bestDistance) {
				bestDistance = distance
				bestIndex = index
			}
		}

		if (bestIndex !== -1 && bestDistance <= SPAM_IMAGE_VISUAL_HASH_MAX_DISTANCE) {
			usedB.add(bestIndex)
			matches += 1
		}
	}

	const score = matches / minSize

	if (score >= SPAM_ATTACHMENT_OVERLAP_THRESHOLD) {
		return {
			match: true,
			score,
			reason: a.text !== b.text ? 'similar_image_album_random_text' : 'similar_image_album',
		}
	}

	return {
		match: false,
		score,
		reason: 'different_visual_album',
	}
}

const getMultiImageAlbumBurstMatch = (a, b) => {
	const imageCountA = a.imageAttachmentCount ?? 0
	const imageCountB = b.imageAttachmentCount ?? 0

	if (
		imageCountA < SPAM_ALBUM_MIN_IMAGES ||
		imageCountB < SPAM_ALBUM_MIN_IMAGES ||
		imageCountA !== imageCountB
	) {
		return {
			match: false,
			score: 0,
			reason: 'not_same_album_shape',
		}
	}

	if (!isLowSignalSpamText(a.text) || !isLowSignalSpamText(b.text)) {
		return {
			match: false,
			score: 0,
			reason: 'album_with_meaningful_text',
		}
	}

	return {
		match: true,
		score: SPAM_ALBUM_BURST_SCORE,
		reason: a.text || b.text ? 'multi_image_album_random_text' : 'multi_image_album_empty_text',
	}
}

const getMediaBurstMatch = (a, b) => {
	if (!a.hasImageAttachments || !b.hasImageAttachments) {
		return {
			match: false,
			score: 0,
			reason: 'not_media_burst',
		}
	}

	if (!isLowSignalSpamText(a.text) || !isLowSignalSpamText(b.text)) {
		return {
			match: false,
			score: 0,
			reason: 'media_with_meaningful_text',
		}
	}

	return {
		match: true,
		score: SPAM_MEDIA_BURST_SCORE,
		reason: a.text || b.text ? 'image_burst_random_text' : 'image_burst_empty_text',
	}
}

const getSpamPayloadSimilarity = (a, b) => {
	if (!a || !b) {
		return {
			match: false,
			score: 0,
			reason: 'missing_payload',
		}
	}

	// 1. Texte identique, similaire, ou même texte avec fin random.
	// Cette règle est volontairement AVANT les règles média pour corriger ton premier test.
	if (a.text && b.text) {
		const textSimilarity = getSpamTextSimilarity(a.text, b.text)
		if (textSimilarity.match) return textSimilarity
	}

	// 2. Même groupe exact de pièces jointes.
	if (
		a.attachmentSignature &&
		b.attachmentSignature &&
		a.attachmentSignature === b.attachmentSignature
	) {
		if (a.text && b.text && a.text !== b.text) {
			return {
				match: true,
				score: 1,
				reason: 'same_attachments_random_text',
			}
		}

		return {
			match: true,
			score: 1,
			reason: 'same_attachments',
		}
	}

	// 3. Même album via overlap de hashes ou metadata.
	const albumOverlapMatch = getAttachmentAlbumOverlapMatch(a, b)
	if (albumOverlapMatch.match) {
		return albumOverlapMatch
	}

	// 4. Même album visuellement similaire si sharp est installé.
	const visualAlbumMatch = getVisualAlbumOverlapMatch(a, b)
	if (visualAlbumMatch.match) {
		return visualAlbumMatch
	}

	// 5. Au moins une pièce jointe identique.
	const sharedExactAttachmentMatch = getSharedExactAttachmentMatch(a, b)
	if (sharedExactAttachmentMatch.match) {
		if (a.text && b.text && a.text !== b.text) {
			return {
				...sharedExactAttachmentMatch,
				reason: 'same_attachment_hash_random_text',
			}
		}

		return sharedExactAttachmentMatch
	}

	// 6. Une image visuellement similaire.
	const visualImageMatch = getVisualImageMatch(a, b)
	if (visualImageMatch.match) {
		if (a.text && b.text && a.text !== b.text) {
			return {
				...visualImageMatch,
				reason: 'similar_image_random_text',
			}
		}

		return visualImageMatch
	}

	// 7. Plusieurs images + texte faible/random.
	const albumBurstMatch = getMultiImageAlbumBurstMatch(a, b)
	if (albumBurstMatch.match) {
		return albumBurstMatch
	}

	// 8. Image(s) + texte faible/random.
	const mediaBurstMatch = getMediaBurstMatch(a, b)
	if (mediaBurstMatch.match) {
		return mediaBurstMatch
	}

	return {
		match: false,
		score: 0,
		reason: 'different_payload',
	}
}

const getSpamImmuneRoleIds = (client) =>
	[
		client.config.guild.roles.STAFF_EDITEURS_ROLE_ID,
		client.config.guild.roles.MODO_ROLE_ID,
		client.config.guild.roles.CERTIF_ROLE_ID,
	]
		.filter(Boolean)
		.map(String)

const isSpamImmune = (member, client) => {
	if (!member) return true

	const immuneRoleIds = getSpamImmuneRoleIds(client)

	if (
		member.permissions.has(PermissionsBitField.Flags.Administrator) ||
		member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
		member.permissions.has(PermissionsBitField.Flags.ManageMessages)
	) {
		return true
	}

	return member.roles.cache.some((role) => immuneRoleIds.includes(role.id))
}

const buildSpamActionRow = (reportId) =>
	new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`spam-action:ban:${reportId}`)
			.setLabel('Ban')
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId(`spam-action:lift:${reportId}`)
			.setLabel('Retirer la sanction')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId(`spam-action:keep:${reportId}`)
			.setLabel('Conserver la sanction')
			.setStyle(ButtonStyle.Secondary),
	)

const applySpamSanction = async (member, client) => {
	if (!member) {
		return {
			ok: false,
			type: 'none',
			label: 'Aucune',
			error: 'Membre introuvable',
		}
	}

	if (member.moderatable) {
		try {
			await member.timeout(
				SPAM_TIMEOUT_MS,
				'Spam cross-salons détecté automatiquement par le bot',
			)

			return {
				ok: true,
				type: 'timeout',
				label: 'Timeout 12 heures',
			}
		} catch (error) {
			console.error(error)
		}
	}

	const mutedRoleId = client.config.guild.roles.MUTED_ROLE_ID
	if (mutedRoleId && member.manageable && !member.roles.cache.has(mutedRoleId)) {
		try {
			await member.roles.add(
				mutedRoleId,
				'Spam cross-salons détecté automatiquement par le bot',
			)

			return {
				ok: true,
				type: 'mute_role',
				label: 'Rôle Muted',
			}
		} catch (error) {
			console.error(error)
		}
	}

	return {
		ok: false,
		type: 'none',
		label: 'Aucune',
		error: 'Impossible de timeout ni de mute ce membre',
	}
}

const buildSpamReportAssets = async (entries) => {
	let embedImageFile = null
	const attachmentLabels = []
	let attachmentIndex = 0

	for (const entry of entries) {
		for (const attachment of entry.message.attachments.values()) {
			attachmentIndex += 1

			const originalName = attachment.name ?? `fichier-${attachmentIndex}`
			attachmentLabels.push(`• ${originalName} — <#${entry.channelId}>`)

			if (embedImageFile || !isImage(originalName)) continue

			const uniqueName = `${entry.messageId}-${attachmentIndex}-${originalName}`

			const buffer = await getLinkBuffer(attachment.proxyURL ?? attachment.url).catch(
				() => null,
			)

			if (!buffer) continue

			embedImageFile = new AttachmentBuilder(buffer, {
				name: uniqueName,
			})
		}
	}

	return {
		embedImageFile,
		attachmentLabels,
	}
}

const parsePrefixedCommand = (messageContent, prefix) => {
	if (!messageContent.startsWith(prefix)) return null

	const escapedPrefix = escapeRegex(prefix)
	const regexCommands = new RegExp(`^${escapedPrefix}([a-zA-Z0-9]+)(?:\\s+(.*))?$`)
	const match = messageContent.match(regexCommands)

	if (!match) return null

	return {
		name: match[1].toLowerCase(),
		argsRaw: match[2] ?? '',
	}
}

const handleCustomCommand = async (message, client, bdd, parsedCommand) => {
	let command = null

	try {
		const sql = 'SELECT * FROM commands WHERE name = ? OR aliases REGEXP ?'
		const data = [parsedCommand.name, `(?:^|,)(${parsedCommand.name})(?:,|$)`]
		const [result] = await bdd.execute(sql, data)
		command = result[0] ?? null
	} catch (error) {
		console.error(error)
		await message.reply({ content: 'Il y a eu une erreur en exécutant la commande 😬' })
		return true
	}

	if (!command || !command.active) {
		return true
	}

	if (!client.cooldowns.has(command.name)) {
		client.cooldowns.set(command.name, new Collection())
	}

	const now = Date.now()
	const timestamps = client.cooldowns.get(command.name)
	const cooldownAmount = (command.cooldown || 4) * 1000

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount

		if (now < expirationTime) {
			const timeLeft = expirationTime - now
			const sentMessage = await message.reply({
				content: `Merci d'attendre ${(timeLeft / 1000).toFixed(
					1,
				)} seconde(s) de plus avant de réutiliser la commande **${command.name}** 😬`,
			})

			client.cache.deleteMessagesID.add(sentMessage.id)
			return true
		}
	}

	timestamps.set(message.author.id, now)
	globalThis.setTimeout(() => {
		timestamps.delete(message.author.id)
	}, cooldownAmount)

	let button = null
	if (command.textLinkButton && command.linkButton) {
		button = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel(command.textLinkButton)
				.setURL(command.linkButton)
				.setStyle(ButtonStyle.Link),
		)
	}

	try {
		const sql = 'UPDATE commands SET numberOfUses = numberOfUses + 1 WHERE name = ?'
		const data = [command.name]
		await bdd.execute(sql, data)

		if (!button) {
			await message.channel.send({
				content: command.content,
			})
			return true
		}

		await message.channel.send({
			content: command.content,
			components: [button],
		})
		return true
	} catch (error) {
		console.error(error)
		await message.reply({ content: 'Il y a eu une erreur en exécutant la commande 😬' })
		return true
	}
}

const handleCrossChannelSpam = async (message, client) => {
	if (!message.guild || !message.member) return false

	const hasText = Boolean(message.content?.trim())
	const hasAttachments = message.attachments.size > 0

	if (!hasText && !hasAttachments) return false
	if (isSpamImmune(message.member, client)) return false

	const bdd = client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return false
	}

	if (!client.cache.crossChannelSpam) {
		client.cache.crossChannelSpam = new Collection()
	}

	const spamCache = client.cache.crossChannelSpam
	const userKey = `${message.guild.id}-${message.author.id}`
	const now = message.createdTimestamp
	const normalizedPayload = await normalizeSpamPayload(message)

	const history = spamCache.get(userKey) || []
	const nextHistory = history
		.filter((entry) => now - entry.createdTimestamp <= SPAM_WINDOW_MS)
		.concat({
			messageId: message.id,
			channelId: message.channel.id,
			createdTimestamp: now,
			payload: normalizedPayload,
			message,
		})
		.slice(-SPAM_TRACK_LIMIT)

	spamCache.set(userKey, nextHistory)

	const similarEntriesWithScores = nextHistory
		.map((entry) => ({
			entry,
			similarity: getSpamPayloadSimilarity(entry.payload, normalizedPayload),
		}))
		.filter(
			({ entry, similarity }) =>
				similarity.match && now - entry.createdTimestamp <= SPAM_WINDOW_MS,
		)

	const similarEntries = similarEntriesWithScores.map(({ entry, similarity }) => ({
		...entry,
		similarityScore: similarity.score,
		similarityReason: similarity.reason,
	}))

	const distinctChannels = new Set(similarEntries.map((entry) => entry.channelId))

	if (similarEntries.length < SPAM_MIN_MESSAGES || distinctChannels.size < SPAM_MIN_CHANNELS) {
		return false
	}

	spamCache.set(
		userKey,
		nextHistory.filter((entry) => {
			const similarity = getSpamPayloadSimilarity(entry.payload, normalizedPayload)
			return !similarity.match
		}),
	)

	const minSimilarityScore = Math.min(
		...similarEntries.map((entry) => entry.similarityScore ?? 1),
	)

	const similarityReasons = [
		...new Set(similarEntries.map((entry) => entry.similarityReason).filter(Boolean)),
	]

	const { embedImageFile, attachmentLabels } = await buildSpamReportAssets(similarEntries)

	const deletedMessages = []
	for (const entry of similarEntries) {
		client.cache.deleteMessagesID.add(entry.messageId)

		const deleted = await entry.message
			.delete()
			.then(() => true)
			.catch(() => false)

		if (deleted) {
			deletedMessages.push(entry)
		}
	}

	const sanction = await applySpamSanction(message.member, client)

	const reportChannel = message.guild.channels.cache.get(
		client.config.guild.channels.REPORT_CHANNEL_ID,
	)

	if (!reportChannel?.isTextBased()) {
		return true
	}

	const channelsList = [...distinctChannels].map((channelId) => `<#${channelId}>`).join(', ')
	const preview = truncateText(message.content ?? '', 1500)
	const reportId = `${message.author.id}-${Date.now()}`

	const reportEmbed = new EmbedBuilder()
		.setColor('#FF3200')
		.setTitle('Spam cross-salons détecté')
		.setAuthor({
			name: displayNameAndID(message.member, message.author),
			iconURL: message.author.displayAvatarURL({ dynamic: true }),
		})
		.setDescription(`\`\`\`\n${preview}\n\`\`\``)
		.addFields(
			{
				name: 'Utilisateur',
				value: `${message.author} (ID : ${message.author.id})`,
				inline: true,
			},
			{
				name: 'Messages supprimés',
				value: String(deletedMessages.length),
				inline: true,
			},
			{
				name: 'Salons concernés',
				value: channelsList,
				inline: false,
			},
			{
				name: 'Sanction automatique',
				value: sanction.ok ? sanction.label : `Échec : ${sanction.error}`,
				inline: false,
			},
			{
				name: 'Critère',
				value: [
					'3 messages similaires dans 3 salons différents en moins de 10 minutes',
					`Similarité : ${(minSimilarityScore * 100).toFixed(0)} %`,
					`Détection code : ${similarityReasons.join(', ') || 'similarité'}`,
				].join('\n'),
				inline: false,
			},
		)
		.setFooter({
			text: 'Choisissez une action ci-dessous',
		})
		.setTimestamp(new Date())

	if (attachmentLabels.length) {
		const attachmentValue = attachmentLabels.join('\n')
		reportEmbed.addFields({
			name: 'Pièces jointes',
			value:
				attachmentValue.length > 1024
					? `${attachmentValue.slice(0, 1020)} ...`
					: attachmentValue,
			inline: false,
		})
	}

	if (embedImageFile) {
		reportEmbed.setImage(`attachment://${embedImageFile.name}`)
	}

	const reportMessage = await reportChannel.send({
		embeds: [reportEmbed],
		components: [buildSpamActionRow(reportId)],
		files: embedImageFile ? [embedImageFile] : [],
	})

	try {
		const sql =
			'INSERT INTO spam_reports (report_id, guild_id, user_id, report_message_id, sanction_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
		const data = [
			reportId,
			message.guild.id,
			message.author.id,
			reportMessage.id,
			sanction.type,
			'pending',
			Math.round(Date.now() / 1000),
		]
		await bdd.execute(sql, data)
	} catch (error) {
		console.error(error)
	}

	return true
}

export default async (message, client) => {
	if (message.author.bot) return

	if (message.partial) {
		await message.fetch().catch(() => null)
		if (message.partial) return
	}

	if (!message.guild) return

	const messageContent = message.content ?? ''
	const parsedCommand = parsePrefixedCommand(messageContent, client.config.guild.COMMANDS_PREFIX)

	// Anti-spam cross-salons
	const spamHandled = await handleCrossChannelSpam(message, client)
	if (spamHandled) return

	// Si le message vient d'une guild, on vérifie
	if (message.member) {
		modifyWrongUsernames(message.member).catch(() => null)

		if (
			client.config.guild.channels.BLABLA_CHANNEL_ID &&
			client.config.guild.roles.JOIN_ROLE_ID &&
			message.channel.id !== client.config.guild.channels.BLABLA_CHANNEL_ID &&
			message.member.roles.cache.has(client.config.guild.roles.JOIN_ROLE_ID)
		) {
			message.member.roles.remove(client.config.guild.roles.JOIN_ROLE_ID).catch((error) => {
				if (error.code !== RESTJSONErrorCodes.UnknownMember) throw error
			})
		}
	}

	// Si c'est un salon no-text
	const NOTEXT = client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.NOTEXT_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (NOTEXT.includes(message.channel.id) && message.attachments.size < 1) {
		const sentMessage = await message.channel.send(
			`<@${message.author.id}>, tu dois mettre une image / vidéo 😕`,
		)

		await message.delete().catch(() => false)

		globalThis.setTimeout(() => {
			sentMessage.delete().catch((error) => {
				if (error.code !== RESTJSONErrorCodes.UnknownMessage) console.error(error)
			})
		}, 7 * 1000)

		return
	}

	// Si c'est un salon auto-thread
	const THREADS = client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS
		? client.config.guild.managers.THREADS_MANAGER_CHANNELS_IDS.split(/, */)
		: []

	if (THREADS.includes(message.channel.id)) {
		await Promise.all([
			message.react('⬆️').catch(() => null),
			message.react('⬇️').catch(() => null),
			message.react('💬').catch(() => null),
		])
	}

	// Acquisition de la base de données
	const bdd = client.config.db.pools.userbot
	if (!bdd) {
		console.log('Une erreur est survenue lors de la connexion à la base de données')
		return
	}

	// Command handler
	if (parsedCommand) {
		const handled = await handleCustomCommand(message, client, bdd, parsedCommand)
		if (handled) return
	}

	// Alertes personnalisées
	let alerts = []
	try {
		const sql = 'SELECT * FROM alerts'
		const [result] = await bdd.execute(sql)
		alerts = result
	} catch (error) {
		console.error(error)
		return
	}

	const hay = messageContent.normalize('NFD').replace(/\p{M}/gu, '')

	for (const alert of alerts) {
		const needle = alert.text
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

		const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${needle}(?=$|[^\\p{L}\\p{N}_])`, 'iu')
		if (!re.test(hay)) continue

		const member = await message.guild.members.fetch(alert.discordID).catch(() => null)
		if (!member) continue

		if (message.author.id === alert.discordID) continue

		const permissionsMember = member.permissionsIn(message.channel)
		if (!permissionsMember.has(PermissionsBitField.Flags.ViewChannel)) continue

		const textCut =
			messageContent.length < 200
				? messageContent.slice(0, 200)
				: `${messageContent.slice(0, 200)} [...]`

		const alertTextCut =
			alert.text.length < 200 ? alert.text.slice(0, 200) : `${alert.text.slice(0, 200)} [...]`

		const escapedcontentText = textCut.replace(/```/g, '\\`\\`\\`')
		const escapedcontentAlertText = alertTextCut.replace(/```/g, '\\`\\`\\`')

		const embedAlert = new EmbedBuilder()
			.setColor('#C27C0E')
			.setTitle('Alerte message')
			.setDescription('Un message envoyé correspond à votre alerte.')
			.setAuthor({
				name: message.guild.name,
				iconURL: message.guild.iconURL({ dynamic: true }),
				url: message.guild.vanityURL ?? undefined,
			})
			.addFields(
				{
					name: 'Alerte définie',
					value: `\`\`\`\n${escapedcontentAlertText}\`\`\``,
				},
				{
					name: 'Message envoyé',
					value: `\`\`\`\n${escapedcontentText}\`\`\``,
				},
				{
					name: 'Salon',
					value: message.channel.toString(),
					inline: true,
				},
				{
					name: 'Auteur',
					value: `${message.author.toString()} (ID : ${message.author.id})`,
					inline: true,
				},
			)

		const buttonMessage = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setLabel('Aller au message')
				.setStyle(ButtonStyle.Link)
				.setURL(
					`https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
				),
		)

		await member
			.send({
				embeds: [embedAlert],
				components: [buttonMessage],
			})
			.catch((error) => {
				if (error.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
					console.error(error)
				}
			})
	}

	// Mention bot
	if (message.mentions.users.has(client.user.id) && !message.mentions.repliedUser) {
		if (client.config.others.openAiKey !== '') {
			const chatgpt = new ChatGPTAPI({
				apiKey: client.config.others.openAiKey,
				completionParams: {
					model: 'gpt-5',
				},
			})

			try {
				const chatgptResponse = await chatgpt.sendMessage(messageContent)

				if (
					chatgptResponse.text.includes('@everyone') ||
					chatgptResponse.text.includes('@here')
				) {
					return message.reply({
						content: `Désolé, je ne peux pas mentionner ${message.guild.memberCount} personnes 😬`,
					})
				}

				if (chatgptResponse.text.length > 1960) {
					return message.reply({
						content: `**[Réponse partielle]**\n\n${chatgptResponse.text.slice(
							0,
							1960,
						)} [...]`,
					})
				}

				return message.reply({ content: chatgptResponse.text })
			} catch (error) {
				console.error(error)
				return message.reply({ content: 'Une erreur est survenue 😬' })
			}
		}
	}

	// Citations Discord
	const regexGlobal =
		/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/g
	const regex =
		/<?https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})>?/

	const matches = messageContent.match(regexGlobal)
	if (!matches) return

	const validMessages = (
		await Promise.all(
			matches
				.reduce((acc, match) => {
					const result = regex.exec(match)
					if (!result) return acc

					const [, guildId, channelId, messageId] = result
					if (guildId !== message.guild.id) return acc

					const foundChannel = message.guild.channels.cache.get(channelId)
					if (!foundChannel || typeof foundChannel.messages?.fetch !== 'function') {
						return acc
					}

					if (match.startsWith('<') && match.endsWith('>')) return acc

					acc.push({ messageId, foundChannel })
					return acc
				}, [])
				.map(async ({ messageId, foundChannel }) => {
					const foundMessage = await foundChannel.messages
						.fetch(messageId)
						.catch(() => null)

					if (
						!foundMessage ||
						(!foundMessage.content && !foundMessage.attachments.size)
					) {
						return null
					}

					return foundMessage
				}),
		)
	).filter(Boolean)

	const sentMessages = await Promise.all(
		validMessages.map(async (validMessage) => {
			const embed = new EmbedBuilder().setColor(0x2f3136).setAuthor({
				name: displayNameAndID(validMessage.member, validMessage.author),
				iconURL: validMessage.author.displayAvatarURL({ dynamic: true }),
			})

			const footerLines = [`Message posté le ${convertDate(validMessage.createdAt)}`]
			let footerIconURL

			const description = `${validMessage.content}\n[Aller au message](${validMessage.url}) - ${validMessage.channel}`

			if (description.length > 4096) {
				embed.setDescription(validMessage.content)
				embed.addFields(
					{
						name: 'Message',
						value: `[Aller au message](${validMessage.url})`,
						inline: true,
					},
					{
						name: 'Salon',
						value: validMessage.channel.toString(),
						inline: true,
					},
				)
			} else {
				embed.setDescription(description)
			}

			if (validMessage.editedAt) {
				footerLines.push(`Modifié le ${convertDate(validMessage.editedAt)}`)
			}

			if (message.author.id !== validMessage.author.id) {
				footerIconURL = message.author.displayAvatarURL({ dynamic: true })
				footerLines.push(
					`Cité par ${displayNameAndID(message.member, message.author)} le ${convertDate(
						message.createdAt,
					)}`,
				)
			}

			embed.setFooter({
				text: footerLines.join('\n'),
				iconURL: footerIconURL,
			})

			const attachments = validMessage.attachments
			if (attachments.size === 1 && isImage(attachments.first().name)) {
				embed.setImage(attachments.first().url)
			} else {
				attachments.forEach((attachment) => {
					const { name, type } = getFileInfos(attachment.name)
					embed.addFields({
						name: `Fichier ${type}`,
						value: `[${name}](${attachment.url})`,
						inline: true,
					})
				})
			}

			return message.channel.send({ embeds: [embed] }).catch(() => null)
		}),
	)

	const successfulSentMessages = sentMessages.filter(Boolean)

	if (
		!messageContent.replace(regexGlobal, '').trim() &&
		successfulSentMessages.length === matches.length &&
		!message.mentions.repliedUser
	) {
		client.cache.deleteMessagesID.add(message.id)
		return message.delete().catch(() => null)
	}
}
