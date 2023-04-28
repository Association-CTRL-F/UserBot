import http from 'http'

export default client => {
	const server = http.createServer((req, res) => {
		if (req.url === '/status') {
			res.writeHead(200, { 'Content-Type': 'text/plain' })
			res.end(`${client.user.tag} is UP`)
		}
	})

	server.listen(3000, () => {
		console.log(
			`---------------------------\nServer started on port 3000\n---------------------------`,
		)
	})
}
