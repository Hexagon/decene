import Message from "./network/message";
import Socket from "./network/socket";

const Decene = require('./');
const {network, encryption} = Decene;


test('Basic interface have properties network and encryption', () => {
  expect(Decene).toHaveProperty('network');
  expect(Decene).toHaveProperty('encryption');
});

test('Peer starts listening', (done) => {
  
  const idData1 = encryption.newIdentityData();

  // Init decene
  const decentPeer1 = new network(idData1,"127.0.0.1",47478,undefined,undefined);
  const listenCallback = (data : any) => {
    expect(data.port).toBeGreaterThan(1);
    expect(data.ip).toEqual("127.0.0.1");
    done();
  };

  decentPeer1.events.on('server:listening', listenCallback);
});

test('Two ppers communicate (way 1)', (done) => {
  
  jest.setTimeout(15000);

  const idData1 = encryption.newIdentityData();
  const idData2 = encryption.newIdentityData();

  // Init decene
  const decentPeer1 = new network(idData1,"127.0.0.1",47480,undefined,undefined);
  const decentPeer2 = new network(idData2,"127.0.0.1",47481,"localhost:47480",undefined);
  const listenCallback = (message: any) => {
    if (message.type === "pong") {
      expect(message.payload.ip).toEqual("127.0.0.1");
      done();
    }
  };

  decentPeer1.events.on('message:received', listenCallback);
});

test('Two peers communicate (way 2)', (done) => {
  
  jest.setTimeout(15000);

  const idData1 = encryption.newIdentityData();
  const idData2 = encryption.newIdentityData();

  // Init decene
  const decentPeer1 = new network(idData1,"127.0.0.1",47482,undefined,undefined);
  const decentPeer2 = new network(idData2,"127.0.0.1",47483,"localhost:47482",undefined);
  const listenCallback = (message: any) => {
    if (message.type === "pong") {
      expect(true).toBeTruthy();
      done();
    }
  };

  decentPeer2.events.on('message:received', listenCallback);
});

test('Peer 1 gets pong from peer 3, not directly connected to eachother.', (done) => {
  
  jest.setTimeout(15000);

  const idData1 = encryption.newIdentityData();
  const idData2 = encryption.newIdentityData();
  const idData3 = encryption.newIdentityData();

  // Init decene
  const decentPeer1 = new network(idData1,"127.0.0.1",47484,undefined,undefined);
  const decentPeer2 = new network(idData2,"127.0.0.1",47485,"localhost:47484",undefined);
  const decentPeer3 = new network(idData3,"127.0.0.1",47486,"localhost:47485",undefined);
  const listenCallback = (message: any) => {
    if (message.type === "pong" && message.payload.node.uuid === idData3.uuid) {
      expect(true).toBeTruthy();
      done();
    }
  };

  decentPeer1.events.on('message:received', listenCallback);
});

test('Unhandled message type emits event', (done) => {
  
  jest.setTimeout(20000);

  const idData1 = encryption.newIdentityData();
  const idData2 = encryption.newIdentityData();

  // Init decene
  const decentPeer1 = new network(idData1,"127.0.0.1",47487,undefined,undefined);
  const decentPeer2 = new network(idData2,"127.0.0.1",47488,"localhost:47487",undefined);

  // Listen to ping from peer1 to peer2, send unhandled message type to peer2
  const listenCallback = (message: any, socket: Socket) => {
    if (message.type === "ping") {
      decentPeer1.reply(socket, new Message("custommessagetype",{}));
    }
  };

    // Listen to custommessagetype from peer2 to peer1
    const listenCallbackUnhandled = (message: any) => {
      if (message.type === "custommessagetype") {
        expect(true).toBeTruthy();
        done();
      }
    };

  decentPeer1.events.on('message:received', listenCallback);
  decentPeer2.events.on('message:unhandled', listenCallbackUnhandled);
});