import http from 'node:http'

export default (client) => {
	const port = 3000

	const server = http.createServer((req, res) => {
		if (req.url === '/status') {
			res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
			res.end(client.user ? `${client.user.tag} is UP` : 'Bot is starting')
			return
		}

		res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
		res.end('Not Found')
	})

	server.on('error', (error) => {
		console.error('HTTP server error:', error)
	})

	server.listen(port, () => {
		console.log(
			`---------------------------\nServer started on port ${port}\n---------------------------`,
		)
	})

	return server
}
