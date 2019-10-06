var selfsigned = require("selfsigned"),
    uuidv1 = require('uuid/v1'),
    fs = require('fs');


function newIdentity(sFilePath) {

    const 
        attrs = [{ name: 'commonName', value: 'decent.network' }];
        pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });

    const data = {
        uuid: uuidv1(),
        key: pems
    };

    try {
        fs.writeFileSync(sFilePath, JSON.stringify(data));
        return data;
    } catch (err) {
        throw(err);
        return false;
    }

}

function loadIdentity(sFilePath) {

    var data,id;
    try {
      data = fs.readFileSync(sFilePath, 'utf8');
    } catch (err) {
      return false;
    }

    try {
        id = JSON.parse(data);
    } catch (err) {
        return false;
    }

    return id;
}

module.exports = {loadIdentity, newIdentity};