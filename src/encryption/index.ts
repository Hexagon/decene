// @ts-ignore
import selfsigned from 'selfsigned';
import { v1 as uuidv1 } from 'uuid';
import fs from 'fs';
import { IIdentity } from './identity';

function newIdentityData() {
  const attrs = [{ name: 'commonName', value: 'decene.network' }];
  const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });

  const data: IIdentity = {
    uuid: uuidv1(),
    key: pems,
  };

  return data;
}

function newIdentity(sFilePath: string) {
  const data = newIdentityData();

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

export default { loadIdentity, newIdentity, newIdentityData };
