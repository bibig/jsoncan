var yi    = require('yi');
var Conn  = require('./libs/connect');
var Table = require('./libs/table');

exports = module.exports = function (path, tableSchemas, validateMessages) {
  this.conn                  = Conn.create(path);
  this.conn.validateMessages = validateMessages;
  this.conn.tables           = tableSchemas || {}; // all tables' definition!
  
  this.capsule = this.table = this.open = function (name, fields) {
    
    if (yi.isNotEmpty(fields) && yi.isPlainObject(fields)) {
      this.conn.tables[name] = fields;
    }

    return Table.create(this.conn, name);
  };
  
  this.refresh = function () {
    var _this = this;

    yi.forEach(this.conn.tables, function (name) {
      _this.table(name).refresh();
    });

  };

};