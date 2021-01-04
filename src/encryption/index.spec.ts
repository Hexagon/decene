import encryption from './index';

test('Create new identity data', () => {
  let data = encryption.newIdentityData();

  expect(data.uuid.length).toBeGreaterThan(0);
  expect(data.key.private.length).toBeGreaterThan(0);
  expect(data.key.public.length).toBeGreaterThan(0);
  expect(data.key.cert.length).toBeGreaterThan(0);
});
