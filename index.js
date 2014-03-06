var Conn = require('./libs/connect');
var Schemas = require('./libs/schemas');
var Table = require('./libs/table');

module.exports = function (path, validateMessages) {
  this.conn = Conn.create(path);
  this.validateMessages = validateMessages;
  this.capsule = this.table = this.open = function (name, fields) {
    return Table.create(this.conn, name, fields, this.validateMessages);
  }
}