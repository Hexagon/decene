const Decene = require('./');

test('Basic interface have properties network and encryption', () => {
  expect(Decene).toHaveProperty('network');
  expect(Decene).toHaveProperty('encryption');
});

/*test('Vote ip works', () => {
  var d = new Decene.network();
  expect(d.votePublicIp("127.0.0.1")).toEqual(false);
  expect(d.votePublicIp("86.1.1.1")).not.toEqual(false);
});*/
