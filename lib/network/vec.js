function Vec(x, y, z) {
    'use strict';

    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;

}

Vec.prototype.sub = function(other) {

    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;

    return this;
};

Vec.prototype.add = function(other) {

    this.x += other.x;
    this.y += other.y;
    this.z += other.z;

    return this;
};

Vec.prototype.mul = function(scalar) {

    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;

    return this;
};

Vec.prototype.div = function(scalar) {

    this.x /= scalar;
    this.y /= scalar;
    this.z /= scalar;

    return this;
};

Vec.prototype.normalize = function() {

    var x = this.x,
        y = this.y,
        z = this.z,
        length = Math.sqrt(x * x + y * y + z * z);

    this.x = x / length;
    this.y = y / length;
    this.z = z / length;

    return this;
};

Vec.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};

Vec.prototype.distance = function(other) {
    var dx = this.x - other.x;
    var dy = this.y - other.y;
    var dz = this.z - other.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

Vec.prototype.copy = function() {
    return new Vec(this.x, this.y, this.z);
};

Vec.prototype.fromString = function(s) {
    var parts = s.split(",");
    if (parts.length == 3) {
        if (!isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return new Vec(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
        } else {
            return;
        }
    } else {
        return;
    }

};

Vec.prototype.toString = function() {
    return "" + this.x + "," + this.y + "," + this.z;
}

Vec.prototype.eq = function(v) {
    if (v && this.x == v.x && this.y == v.y && this.z == v.z) {
        return true;
    } else {
        return false;
    }
}

module.exports = Vec;