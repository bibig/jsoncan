var Conn = require('./libs/connect');
// var Schemas = require('./libs/schemas');
var Table = require('./libs/table');


exports = module.exports = function (path, tableSchemas, validateMessages) {
  this.conn = Conn.create(path);
  this.validateMessages = validateMessages;
  this.tables = tableSchemas || {}; // all tables' definition!
  
  this.capsule = this.table = this.open = function (name, fields) {
    if (fields) {
      this.tables[name] = fields;
    }
    return Table.create(this, name);
  }
};