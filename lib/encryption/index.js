"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
var selfsigned_1 = __importDefault(require("selfsigned"));
var uuid_1 = __importDefault(require("uuid"));
var fs_1 = __importDefault(require("fs"));
function newIdentity(sFilePath) {
    var attrs = [{ name: 'commonName', value: 'decene.network' }];
    var pems = selfsigned_1.default.generate(attrs, { days: 365, keySize: 2048 });
    var data = {
        uuid: uuid_1.default.v1(),
        key: pems,
    };
    try {
        fs_1.default.writeFileSync(sFilePath, JSON.stringify(data));
        return data;
    }
    catch (err) {
        throw err;
        return false;
    }
}
function loadIdentity(sFilePath) {
    var data;
    try {
        data = fs_1.default.readFileSync(sFilePath, 'utf8');
    }
    catch (err) {
        return false;
    }
    var id;
    try {
        id = JSON.parse(data);
    }
    catch (err) {
        return false;
    }
    return id;
}
exports.default = { loadIdentity: loadIdentity, newIdentity: newIdentity };
