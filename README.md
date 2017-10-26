# pull-stream-to-net-socket
Converts a pull-stream duplex into a net.Socket
```js
const toSocket = require('pull-stream-to-net-socket')
```

# Why

Every tried to use native TLS or any other nodeJS thing that requires net.Sockets or a net.Server?

It's way too complicated...

That's why I created `pull-stream-to-net-socket`

# API
`toSocket(duplex[, options, callback])`

- `duplex`: A pull-stream duplex stream
- `options`: An object containing the options
  - `createServer`: Custom function used instead of `net.createServer`
  - `createClient`: Custom function used instead of `net.connect(server.address())`

  Both `createServer` and `createClient` listen for secureConnect(ion) instead of the connect(ion) event if the return value is a `tls.TLSSocket` or `tls.Server` instance

  - `prefire`: Start sending data from the duplex immediatly instead of waiting for `.run()` to be called
  - `inverse`: Reverse the stream-flow direction

  This will make the server socket the primary and the client socket the secondary
- `callback`: Function which will be called with `(err, primary, secondary)`
  - `err` is the error that occured anywhere in the process
  - `primary` is the socket that can be used to send data through.
  By default no data is sent unless `primary.run()` is called.
  - `secondary` the socket used to establish a connection.
  Not intended to be used to sent data with.

# Flow
First a server is created using `createServer()`.
That server is then listening on a random port.

A client that connects to the server is created using `createClient(server.address())`.
When the client successfully connects and `prefire` is enabled the circuit is established (duplex -> client -> duplex OR if `inverse` is true duplex -> server-side client -> duplex).

After that it is being listened for the connect(ion) event (or  secureConnect(ion) for `tls.TLSSocket`s or `tls.Server`s) on both sides (`prefire` prevents deadlocks if one side is tls and another plain net as secureConnect wouldn't be called).

If no error occured the callback is called with `cb(null, primary, secondary)` otherwise `cb(err)`.

# Examples
It's very complicated to understand the purpose without examples

## TLS client
`duplex` is a pull-stream connection to a TLS server
```js
toSocket(duplex, {
  createClient: dest => tls.connect(dest), //use tls instead of net
  prefire: true //prevent said deadlock
}, (err, client) => {
  if (err) throw err //possibly some cert error. try setting "rejectUnauthorized: false"
  //client is a tls.TLSSocket instance that can be converted to a pull-stream
  pull(
    pull.values(["hello world"]),
    toPull.duplex(client),
    pull.log()
  )
})
```

## TLS server
`duplex` is a pull-stream connection to a TLS client
```js
toSocket(duplex, {
  createServer: () => tls.createServer({ //for this to work you also need a self-signed/x509 cert.
    cert,
    key
  }),
  prefire: true, //prevent said deadlock
  inverse: true //make the server the primary target / "connect to client" mode
}, (err, client) => {
  if (err) throw err //possibly some cert error. try setting "rejectUnauthorized: false"
  //client is a tls.TLSSocket instance that can be converted to a pull-stream
  pull(
    pull.values(["hello world"]),
    toPull.duplex(client),
    pull.log()
  )
})
```
