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
  const duplex = {
    sink: pull.collect((err, res) => {
      expect(err).to.not.exist()
      expect(res).to.eql(test)
    }),
    source: pull.values(test)
  }
  toSocket(duplex, opt, (err, socket) => {
    expect(err).to.not.exist()
    socket.run()
    pull(
      pull.values(test.slice(0)),
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
  describe("one-side io", () => {
    it("should correctly transmit the data", forwardTest({}))
    it("should correctly recieve the data", backwardTest({}))
    it("should correctly send data back and forth", dualTest({}))
    it("should work correctly in race")
  })
  describe("one-side io reverse", () => {
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
  describe("two-side io", () => {
    it("should correctly transmit the data")
    it("should correctly recieve the data")
    it("should correctly send data back and forth")
    it("should work correctly in race")
  })
  describe("two-side io reverse", () => {
    it("should correctly transmit the data")
    it("should correctly recieve the data")
    it("should correctly send data back and forth")
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
  })
  describe.skip("option validation")
})
