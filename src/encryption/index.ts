// @ts-ignore
import selfsigned from 'selfsigned';
import uuid from 'uuid';
import fs from 'fs';
import { IIdentity } from './identity';

function newIdentity(sFilePath: string) {
  const attrs = [{ name: 'commonName', value: 'decene.network' }];
  const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });

  const data: IIdentity = {
    uuid: uuid.v1(),
    key: pems,
  };

  try {
    fs.writeFileSync(sFilePath, JSON.stringify(data));
    return data;
  } catch (err) {
    throw err;
    return false;
  }
}

function loadIdentity(sFilePath: string) {
  let data;
  try {
    data = fs.readFileSync(sFilePath, 'utf8');
  } catch (err) {
    return false;
  }

  let id;
  try {
    id = JSON.parse(data);
  } catch (err) {
    return false;
  }

  return id;
}

export default { loadIdentity, newIdentity };
