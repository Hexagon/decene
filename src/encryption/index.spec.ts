import encryption from './index';
import os from 'os';
import path from 'path';

test('Create new identity data', () => {
  const data = encryption.newIdentityData();

  expect(data.uuid.length).toBeGreaterThan(0);
  expect(data.key.private.length).toBeGreaterThan(0);
  expect(data.key.public.length).toBeGreaterThan(0);
  expect(data.key.cert.length).toBeGreaterThan(0);
});

test('Store and load identity data', () => {
  const idFile = path.join(os.tmpdir(), '.decent.test.id');

  const idGenerated = encryption.newIdentity(idFile);
  const idLoaded = encryption.loadIdentity(idFile);

  expect(idGenerated).toBeDefined();
  if (idGenerated) {
    expect(idGenerated.uuid.length).toBeGreaterThan(0);
    expect(idGenerated.key.private.length).toBeGreaterThan(0);
    expect(idGenerated.key.public.length).toBeGreaterThan(0);
    expect(idGenerated.key.cert.length).toBeGreaterThan(0);
  }

  expect(idLoaded).toBeDefined();
  if (idLoaded) {
    expect(idLoaded.uuid.length).toBeGreaterThan(0);
    expect(idLoaded.key.private.length).toBeGreaterThan(0);
    expect(idLoaded.key.public.length).toBeGreaterThan(0);
    expect(idLoaded.key.cert.length).toBeGreaterThan(0);
  }

  if (idLoaded && idGenerated) {
    expect(idLoaded.uuid).toEqual(idGenerated.uuid);
    expect(idLoaded.key.private).toEqual(idGenerated.key.private);
    expect(idLoaded.key.public).toEqual(idGenerated.key.public);
    expect(idLoaded.key.cert).toEqual(idGenerated.key.cert);
  }
});
