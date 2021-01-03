const Decene = require('./');

test('Basic interface have properties network and encryption', () => {
  expect(Decene).toHaveProperty('network');
  expect(Decene).toHaveProperty('encryption');
});
