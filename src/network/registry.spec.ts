import { assert } from 'console';
import { EventEmitter } from 'events';
import encryption from '../encryption';
import Address from './address';
import { Peer, PeerStatus } from './peer';
import Registry from './registry';

const testId1 = encryption.newIdentityData();
const testId2 = encryption.newIdentityData();
const testId3 = encryption.newIdentityData();

test('Should not add self', () => {
  // Arrange
  const events = new EventEmitter();
  const testNode = new Peer(new Address('127.0.0.1', 47474), PeerStatus.Alive, testId1.uuid);
  const reg = new Registry(events, testNode, undefined);
  reg.update(testNode);

  expect(reg.count(PeerStatus.Alive)).toEqual(0);
  expect(reg.count(PeerStatus.Pending)).toEqual(0);
  expect(reg.count(PeerStatus.Dead)).toEqual(0);
});

test('Should add alive', () => {
  // Arrange
  const events = new EventEmitter();
  const testNode = new Peer(new Address('127.0.0.1', 47474), PeerStatus.Alive, testId1.uuid);
  const reg = new Registry(events, testNode, undefined);

  const testNodeAdd = new Peer(new Address('127.0.0.1', 47475), PeerStatus.Alive, testId2.uuid);
  reg.update(testNodeAdd);

  expect(reg.count(PeerStatus.Alive)).toEqual(1);
  expect(reg.count(PeerStatus.Pending)).toEqual(0);
  expect(reg.count(PeerStatus.Dead)).toEqual(0);
});

test('Should add pending', () => {
  // Arrange
  const events = new EventEmitter();
  const testNode = new Peer(new Address('127.0.0.1', 47474), PeerStatus.Alive, testId1.uuid);
  const reg = new Registry(events, testNode, undefined);

  const testNodeAdd = new Peer(new Address('127.0.0.1', 47475), PeerStatus.Pending, testId2.uuid);
  reg.update(testNodeAdd);

  expect(reg.count(PeerStatus.Alive)).toEqual(0);
  expect(reg.count(PeerStatus.Pending)).toEqual(1);
  expect(reg.count(PeerStatus.Dead)).toEqual(0);
});

test('Should not add twice', () => {
  // Arrange
  const events = new EventEmitter();
  const testNode = new Peer(new Address('127.0.0.1', 47474), PeerStatus.Alive, testId1.uuid);
  const reg = new Registry(events, testNode, undefined);

  const testNodeAdd = new Peer(new Address('127.0.0.1', 47475), PeerStatus.Pending, testId2.uuid);
  reg.update(testNodeAdd);
  reg.update(testNodeAdd);

  expect(reg.count(PeerStatus.Alive)).toEqual(0);
  expect(reg.count(PeerStatus.Pending)).toEqual(1);
  expect(reg.count(PeerStatus.Dead)).toEqual(0);
});

test('Should be able to get node', () => {
  // Arrange
  const events = new EventEmitter();
  const testNode = new Peer(new Address('127.0.0.1', 47474), PeerStatus.Alive, testId1.uuid);
  const reg = new Registry(events, testNode, undefined);

  const testNodeAdd = new Peer(new Address('127.0.0.1', 47475), PeerStatus.Pending, testId2.uuid);
  reg.update(testNodeAdd);

  if (testNodeAdd.uuid) expect(reg.get(testNodeAdd.uuid)).toHaveProperty('uuid');
});

test('Should get 1 or 0 nodes from random', () => {
  // Arrange
  const events = new EventEmitter();
  const testNode = new Peer(new Address('127.0.0.1', 47474), PeerStatus.Alive, testId1.uuid);
  const reg = new Registry(events, testNode, undefined);

  const testNodeAdd = new Peer(new Address('127.0.0.1', 47475), PeerStatus.Pending, testId2.uuid);
  reg.update(testNodeAdd);
  const testNodeAdd2 = new Peer(new Address('127.0.0.2', 47476), PeerStatus.Pending, testId3.uuid);
  reg.update(testNodeAdd2);

  expect(reg.first(PeerStatus.Alive)).toBeUndefined();
  expect(reg.random(PeerStatus.Alive)).toBeUndefined();
  expect(reg.first(PeerStatus.Pending)).toHaveProperty('uuid');
  expect(reg.random(PeerStatus.Pending)).toHaveProperty('uuid');
  expect(reg.all(PeerStatus.Alive).length).toEqual(0);
  expect(reg.all(PeerStatus.Pending).length).toEqual(2);
});
