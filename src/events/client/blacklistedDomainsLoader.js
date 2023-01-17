export default async (client, bdd) => {
	// Récupération des domaines blacklistés en base de données
	try {
		const sql = 'SELECT * FROM automod_domains'
		const [blackListedDomains] = await bdd.execute(sql)

		blackListedDomains.forEach(domain => {
			client.cache.blacklistedDomains.add(domain.domain)
		})
	} catch (error) {
		return console.error(error)
	}
}
