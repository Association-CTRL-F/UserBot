import { env } from '#app/setup';

type AffiliateApiSuccess = {
	status_message?: string;
	data?: {
		short_url?: string;
	};
};

export class AffiliateApiError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'AffiliateApiError';
	}
}

export class AffiliateService {
	public constructor(
		private readonly apiUrl: string,
		private readonly apiKey: string
	) {}

	public async createLink(longUrl: string) {
		const response = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: this.apiKey,
			},
			body: JSON.stringify({ long_url: longUrl }),
		});

		const responseData = (await response.json()) as AffiliateApiSuccess;

		if (!response.ok) {
			throw new AffiliateApiError(
				responseData?.status_message ?? 'Une erreur est survenue 😬'
			);
		}

		const shortUrl = responseData?.data?.short_url;
		if (!shortUrl) {
			throw new AffiliateApiError(
				responseData?.status_message ?? "Aucun lien n'a été généré 😬"
			);
		}

		return shortUrl;
	}

	public async createLinks(urls: string[]) {
		return Promise.all(urls.map((url) => this.createLink(url)));
	}
}

export const affiliateService = new AffiliateService(
	env.AFFILIATE_API_URL,
	env.AFFILIATE_API_KEY
);
