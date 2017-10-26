"use strict"

const toStream = require("pull-stream-to-stream")
const net = require("net")

const createServer = () => net.createServer()
const createClient = (addr) => net.createConnection(addr)
const EE = require("events").EventEmitter

module.exports = function pullStreamToNetSocket(stream, opt, cb) {
  if (!stream || typeof stream == "function" || !stream.sink || !stream.source)
    throw new TypeError("Argument must be a pull-stream duplex. If you only got a source and a sink pass them as { source, sink }")
  if (typeof opt == "function") {
    cb = opt
    opt = {}
  }
  if (!cb) cb = err => err ? console.error(err) : null
  const server = createServer()
  const ee = new EE()
  let c = {}
  ee.on("conn", (from, conn) => {
    c[from] = conn
    if (c.server && c.client) {
      const client = c.client
      c.client.run = () => {
        const conn = toStream(stream)
        const connserver = c.server
        conn.pipe(connserver) //(pull) -> server -> (net) -> client
        connserver.pipe(conn)
      }
      return cb(null, client)
    }
  })
  server.listen(0, err => {
    if (err) return cb(err)
    const addr = server.address()
    const client = createClient(addr)
    client.once("connect", () => {
      ee.emit("conn", "client", client)
    })
    client.once("error", e => cb(e))
    server.once("connection", conn => {
      ee.emit("conn", "server", conn)
      server.close()
    })
  })
}
