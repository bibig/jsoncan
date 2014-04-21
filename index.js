var Conn = require('./libs/connect');
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
  };
  
  
  this.backup = function (file, callback) {
    var async = require('async');
    var fs = require('fs');
    var self = this;
    var db = {};
    var tables = Object.keys(this.conn.tables);
    
    function tableBackup (name, callback) {
      var table = self.open(name);
      table.query().exec(function (err, records) {
        if (err) {
          callback(err);
        } else {
          db[name] = records;
          callback();
        }
      });
    }
    
    async.each(tables, tableBackup, function (err) {
      if (err) { 
        callback(err);
      } else {
        fs.writeFile(file, JSON.stringify(db), callback);
      }
    });
  }; // end of backup
  
  // todo ...
  this.recover = function (file, callback) {};
};