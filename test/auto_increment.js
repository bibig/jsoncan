var should = require('should');
var assert = require('assert');
var fs = require('fs');
var Jsoncan = require('../index');
var path = require('path');
var utils = require('./utils');
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
    utils.clear(PATH, done);
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
      // console.log(record);
      done();
    });
  });
  
  it('test second insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      assert.equal(record.id, 105);
      // console.log(record);
      done();
    });
  });
  
  it('test third insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      assert.equal(record.id, 110);
      // console.log(record);
      done();
    });
  });
  
  it('test updateAll', function (done) {
    Table.updateAll({id: ['>', 0]}, {name: 'new name'}, function (e) {
      should.not.exist(e);
      done();
    });
  }); 
  
  it('test findAll', function (done) {
    Table.findAll({id: ['>', 0]}, function (e, records) {
      should.not.exist(e);
      assert.equal(records.length, 3);
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