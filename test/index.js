const pull = require("pull-stream")
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
// const toStream = require("pull-stream-to-stream")
const toPull = require("stream-to-pull-stream")
const toSocket = require("..")
const fs = require("fs")
const path = require("path")
const read = (...file) => fs.readFileSync(path.join(__dirname, ...file))
const net = require("net")
const assert = require("assert")
const tls = require("tls")
chai.use(dirtyChai)

const forwardTest = opt => cb => {
  const test = [Buffer.from("helloworld")]
  const duplex = {
    sink: pull.drain(),
    source: pull.values(test)
  }
  toSocket(duplex, opt, (err, socket) => {
    expect(err).to.not.exist()
    socket.run()
    pull(
      toPull.duplex(socket),
      pull.collect((err, res) => {
        expect(err).to.not.exist()
        expect(res).to.eql(test)
        cb()
      })
    )
  })
}

const backwardTest = opt => cb => {
  const test = [Buffer.from("helloworld")]
  const duplex = {
    sink: pull.collect((err, res) => {
      expect(err).to.not.exist()
      expect(res).to.eql(test)
      cb()
    }),
    source: pull.values([])
  }
  toSocket(duplex, opt, (err, socket) => {
    expect(err).to.not.exist()
    socket.run()
    pull(
      pull.values(test.slice(0)),
      toPull.duplex(socket)
    )
  })
}

const dualTest = opt => cb => {
  const test = [Buffer.from("helloworld")]
  const test2 = [Buffer.from("worldhello")]
  const duplex = {
    sink: pull.collect((err, res) => {
      expect(err).to.not.exist()
      expect(res).to.eql(test2)
    }),
    source: pull.values(test)
  }
  toSocket(duplex, opt, (err, socket) => {
    expect(err).to.not.exist()
    socket.run()
    pull(
      pull.values(test2.slice(0)),
      toPull.duplex(socket),
      pull.collect((err, res) => {
        expect(err).to.not.exist()
        expect(res).to.eql(test)
        cb()
      })
    )
  })
}

describe("pull-stream-to-net-socket", () => {
  describe("simple io", () => {
    it("should correctly transmit the data", forwardTest({}))
    it("should correctly recieve the data", backwardTest({}))
    it("should correctly send data back and forth", dualTest({}))
    it("should work correctly in race")
  })
  describe("simple io reverse", () => {
    it("should correctly transmit the data", forwardTest({
      inverse: true
    }))
    it("should correctly recieve the data", backwardTest({
      inverse: true
    }))
    it("should correctly send data back and forth", dualTest({
      inverse: true
    }))
    it("should work correctly in race")
  })
  describe("tls-rsa", () => {
    const cert = read("cert.pem")
    const key = read("key.pem")
    const createServer = () => tls.createServer({
      key,
      cert
    })
    const createClient = (dest) => {
      dest.ca = [cert]
      return tls.connect(dest)
    }
    it("should correctly transmit the data", forwardTest({
      createServer,
      createClient
    }))
    it("should correctly recieve the data", backwardTest({
      createServer,
      createClient
    }))
    it("should correctly send data back and forth", dualTest({
      createServer,
      createClient
    }))
    it("should work correctly in race")

    it("real-world: connect to google.com", cb => {
      const client = net.connect({
        host: "google.com",
        port: 443
      })
      const duplex = toPull.duplex(client) //this is representing a client that is using pull-streams everywhere
      toSocket(duplex, {
        createClient: (dest) => {
          dest.checkServerIdentity = () => {}
          tls.connect({
            checkServerIdentity: () => {} //we are connecting to localhost
          })
        },
        prefire: true //ensures the data from the server get's send after connection otherwise secureConnect never gets called
      }, (err, client) => {
        expect(err).to.not.exist()
        let s = 1
        pull(
          //pull.values([Buffer.from(["GET / HTTP/1.1", "Host: google.com", "User-Agent: pull-stream-to-net-socket/0.0.1", "Accept: */*"].join("\r\n"))]),
          (end, cb) => {
            if (end) return cb(end)
            if (s--) cb(null, "GET /\r\n")
            else setTimeout(() => cb(true), 1000) //if we quit to early (instantly after sending) the server never responds
          },
          toPull(client),
          pull.collect((err, res) => {
            expect(err).to.not.exist()
            const data = Buffer.concat(res)
            assert(data.length, "no data recieved")
            assert(data.toString().startsWith("HTTP/1"), "something is wrong")
            cb()
          })
        )
      })
    })
  })
  describe.skip("option validation")
})
