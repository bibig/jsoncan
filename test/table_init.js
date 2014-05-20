var should  = require('should');
var utils   = require('./utils');
var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'table_init_test');
var fs      = require('fs');

describe('[init status]', function () {
  
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
    
  before(function (done) {
    utils.clear(PATH, function () {
      can = new Jsoncan(PATH);
      table = can.open('myTable', schemas);
      done();
    });
  });
  

  after(function (done) {
    utils.clear(PATH, done);
  });


  it('query() should work in empty table', function (done) {
    table.query().exec(function (e, records) {
      should.not.exist(e);
      should.equal(records.length, 0);
      done();
    });
  });
  
  it('query() sync should work in empty table', function () {
    var records = table.query().execSync();
    should.equal(records.length, 0);
  });
    
  it('query().count() should work in empty table', function (done) {
    table.query().count(function (e, count) {
      should.not.exist(e);
      should.equal(count, 0);
      done();
    });
  });
  
  it('query().countSync() should work in empty table', function () {
    var count = table.query().countSync();
    should.equal(count, 0);
    count = table.query({name: 'noneExist'}).countSync();
    should.equal(count, 0);
  });
  
  it('table.count() should work in empty table', function (done) {
    table.count({}, function (e, count) {
      should.not.exist(e);
      should.equal(count, 0);
      done();
    });
  });
  
  it('table.countSync() should work in empty table', function () {
    var count = table.countSync();
    should.equal(count, 0);
    count = table.countSync({});
    should.equal(count, 0);
    count = table.countSync({name: 'noneExist'});
    should.equal(count, 0);
  });
});