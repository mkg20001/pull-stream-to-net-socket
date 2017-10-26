"use strict"

const toStream = require("pull-stream-to-stream")
const net = require("net")
const tls = require("tls")

const debug = require("debug")
const _log = debug("pull-stream-to-net-socket")

const createServer = () => net.createServer()
const createClient = (addr) => net.createConnection(addr)
const EE = require("events").EventEmitter

module.exports = function pullStreamToNetSocket(stream, opt, cb) {
  if (!stream || typeof stream == "function" || !stream.sink || !stream.source)
    throw new TypeError("Argument must be a pull-stream duplex. If you only got a source and a sink pass them as { source, sink }")
  const log = _log.bind(_log, "socket#" + Math.random().toString().replace(/0/g, "").replace(/\./g, "").substr(0, 5))
  if (typeof opt == "function") {
    cb = opt
    opt = {}
  }
  if (!cb) cb = err => err ? console.error(err) : null
  if (!opt) opt = {}
  log("create", opt)
  log("create server")
  const server = (opt.createServer || createServer)()
  const ee = new EE()
  let c = {}
  ee.on("conn", (from, conn) => {
    log("got", from)
    c[from] = conn
    if (c.server && c.client) {
      const client = c.client
      c.client.run = () => {
        log("establishing circuit")
        const conn = toStream(stream)
        const connserver = c.server
        if (opt.inverse) {
          conn.pipe(client) //conn -> (pull) -> client -> (net) -> server
          client.pipe(conn) //server -> (net) -> client -> (pull) -> conn
        } else {
          conn.pipe(connserver) //conn -> (pull) -> server -> (net) -> client
          connserver.pipe(conn) //client -> (net) -> server -> (pull) -> conn
        }
        log("done")
      }
      log("calling cb")
      return cb(null, client, c.server)
    }
  })
  server.listen(0, err => {
    if (err) return cb(err)
    const addr = server.address()
    const client = (opt.createClient || createClient)(addr)
    log("create client")
    client.once(client instanceof tls.TLSSocket ? "secureConnect" : "connect", () => {
      log("client connected")
      ee.emit("conn", "client", client)
    })
    client.once("error", e => cb(e))
    server.once(server instanceof tls.Server ? "secureConnection" : "connection", conn => {
      log("server-side client connected")
      ee.emit("conn", "server", conn)
      log("shutting down server")
      server.close()
    })
  })
}
