var Conn = require('./libs/connect');
// var Schemas = require('./libs/schemas');
var Table = require('./libs/table');


exports = module.exports = function (path, tableSchemas, validateMessages) {
  this.conn = Conn.create(path);
  this.conn.validateMessages = validateMessages;
  this.conn.tables = tableSchemas || {}; // all tables' definition!
  
  this.capsule = this.table = this.open = function (name, fields) {
    if (fields) {
      this.conn.tables[name] = fields;
    }
    return Table.create(this.conn, name);
  }
  
  this.refresh = function () {
    var _this = this;
    Object.keys(this.conn.tables).forEach(function (name) {
      _this.table(name).refresh();
    });
  }
};