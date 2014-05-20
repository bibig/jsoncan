var should = require('should');
var utils = require('./utils');
var rander = require('rander');
var Jsoncan = require('../index');
var path = require('path');
var PATH = path.join(__dirname, 'table_reset_test');
var fs = require('fs');

describe('test index fields', function () {
  
  var can, table;
  var count = 100;
  var schemas = {
    id: {
      type: 'autoIncrement',
      index: true
    },
    name: {
      type: 'string',
      index: true,
      required: true
    },
    age: {
      type: 'int',
      required: true
    },
    created: {
      type: 'created',
      index: true
    }
  };
  
  function addData () {
    var record;
  
    for (var i = 0; i< count; i++) {
      record = table.insertSync({
        name: rander.string(),
        age: 18
      });
      // console.log(record);
    }
  }
  
  before(function (done) {
    utils.clear(PATH, function () {
      can = new Jsoncan(PATH);
      table = can.open('myTable', schemas);
      addData();
      done();
    });
  });
  

  after(function (done) {
    utils.clear(PATH, done);
  });
  
  it('test ids reset', function () {
    var indexFile = table.conn.getTableIndexFile(table.table, '_id');
    fs.unlinkSync(indexFile);
    table.resetIdsFile();
    should.ok(fs.existsSync(indexFile));
  });
  
  it('read all ids after reset', function () {
    var ids = table.conn.readTableIdIndexFileSync(table.table);
    // console.log(ids);
    should.ok(ids.length, count);
  });
  
  it('test reset index', function () {
    var indexFile = table.conn.getTableIndexFile(table.table, 'id');
    fs.unlinkSync(indexFile);
    table.resetIndexFile('id');
    should.ok(fs.existsSync(indexFile));
  });
  
  it('read record by this index after reset', function () {
    var records = table.conn.readIndexSync(table.table, 'id', null);
    // console.log(records);
    should.ok(Object.keys(records).length, count);
  });
  
  it('test reset all indexes', function () {
    var indexFile1 = table.conn.getTableIndexFile(table.table, 'id');
    var indexFile2 = table.conn.getTableIndexFile(table.table, 'name');
    var indexFile3 = table.conn.getTableIndexFile(table.table, 'created');
    
    fs.unlinkSync(indexFile1);
    fs.unlinkSync(indexFile2);
    fs.unlinkSync(indexFile3);

    table.resetAllIndexFiles();
    
    should.ok(fs.existsSync(indexFile1));
    should.ok(fs.existsSync(indexFile2));
    should.ok(fs.existsSync(indexFile3));
    
  });
  
  it('test can.refresh', function () {
    var indexFile1 = table.conn.getTableIndexFile(table.table, 'id');
    var indexFile2 = table.conn.getTableIndexFile(table.table, 'name');
    var indexFile3 = table.conn.getTableIndexFile(table.table, 'created');
    
    fs.unlinkSync(indexFile1);
    fs.unlinkSync(indexFile2);
    fs.unlinkSync(indexFile3);

    can.refresh();
    
    should.ok(fs.existsSync(indexFile1));
    should.ok(fs.existsSync(indexFile2));
    should.ok(fs.existsSync(indexFile3));
    
  });
  
});