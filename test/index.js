const pull = require("pull-stream")
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
const toStream = require("pull-stream-to-stream")
const toPull = require("stream-to-pull-stream")
const toSocket = require("..")
chai.use(dirtyChai)

describe("pull-stream-to-net-socket", () => {
  describe("one-side io", () => {
    it("should correctly transmit the data", cb => {
      const test = [Buffer.from("helloworld")]
      const duplex = {
        sink: pull.drain(),
        source: pull.values(test)
      }
      toSocket(duplex, (err, socket) => {
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
    })
    it("should correctly recieve the data")
    it("should work correctly in race")
  })
  describe("one-side io reverse", () => {
    it("should correctly transmit the data")
    it("should correctly recieve the data")
    it("should work correctly in race")
  })
  describe("two-side io", () => {
    it("should correctly transmit the data")
    it("should correctly recieve the data")
    it("should work correctly in race")
  })
  describe("two-side io reverse", () => {
    it("should correctly transmit the data")
    it("should correctly recieve the data")
    it("should work correctly in race")
  })
  describe("tls-rsa", () => {
    it("should correctly transmit the data")
    it("should correctly recieve the data")
    it("should work correctly in race")
  })
  describe.skip("option validation")
})
