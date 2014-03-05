var Conn = require('./libs/connect');
var Schemas = require('./libs/schemas');
var Table = require('./libs/table');

/*
exports.open = open;
function open (path, validateMessages) {
  var conn = Conn.create(path);
  
  return {
    Schemas: Schemas,
    table: function (name, fields, validateMessages) {
      return Table.create(conn, name, fields, validateMessages);
    }
  };
}
*/

module.exports = function (path, validateMessages) {
  this.conn = Conn.create(path);
  this.validateMessages = validateMessages;
  this.capsule = this.table = this.open = function (name, fields) {
    return Table.create(this.conn, name, fields, this.validateMessages);
  }
}