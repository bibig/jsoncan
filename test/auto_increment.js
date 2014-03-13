var should = require('should');
var assert = require('assert');
var fs = require('fs');
var exec = require('child_process').exec;
var Jsoncan = require('../index');
var path = require('path');
var PATH = path.join(__dirname, '_data');

describe('test auto-increment field', function () {
  
  var Table;
  
  var fields = {
    id: {
      type: 'autoIncrement',
      autoIncrement: 100,
      step: 5
    },
    name: {
      type: 'string',
      max: 12
    }
  };
    
  var data = {};
  var tableName = 'autoIncrementTestTable';
  
  after(function (done) {
    var command = 'rm -rf ' + PATH;
    exec(command, function(err, stdout, stderr) {
      done();
    });
  });
  
  it('test create table', function () {
    var can = new Jsoncan(PATH);
    Table = can.open(tableName, fields);
    var autoIncrementFileExists = fs.existsSync(Table.conn.getTableUniqueAutoIncrementFile(tableName, 'id'));
    assert.ok(autoIncrementFileExists);
  });
  
  it('test first insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      assert.equal(record.id, 100);
      done();
    });
  });
  
  it('test second insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      assert.equal(record.id, 105);
      done();
    });
  });
  
  it('test third insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      assert.equal(record.id, 110);
      done();
    });
  });
  
  it('test findby, auto increment field is unique too', function (done) {
    Table.findBy('id', 100, function (e, record) {
      should.not.exist(e);
      // console.log(record);
      record.should.have.property('id');
      done();
    });
  });
  
});