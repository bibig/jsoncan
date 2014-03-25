var should = require('should');
var assert = require('assert');
var utils = require('./utils');
var faker = require('faker');
var Jsoncan = require('../index');
var path = require('path');
var PATH = path.join(__dirname, '_index_fields_test');
var fs = require('fs');

describe('test index fields', function () {
  
  var can, table;
  var schemas = {
    date: {
      type: 'date',
      isIndex: true,
      required: true
    },
    name: {
      type: 'string',
      isIndex: true,
      required: true
    },
    age: {
      type: 'int',
      required: true
    }
  };
  
  var pastCount = 100;
  var todayCount = 20;
  var todayInLastYearCount = 15;
  var steveCount = 12;
  var babyCount = 3;
  
  function getTodayInLastYear () {
    var today = new Date();
    return new Date([today.getFullYear() - 1, today.getMonth() + 1, today.getDate()].join('-'));
  }
  
  function getToday () {
    var today = new Date();
    return new Date([today.getFullYear(), today.getMonth() + 1, today.getDate()].join('-'));
  }
  
  function addData () {
    var record;
  
    for (var i = 0; i< pastCount; i++) {
      record = table.insertSync({
        date: new Date(new Date() - 24 * 3600 * 1000 - Math.random() * 10000000000),
        name: faker.Name.findName(),
        age: 30
      });
      // console.log(record);
    }
    
    for (var i = 0; i < todayCount; i++) {
      record = table.insertSync({
        date: getToday(),
        name: (i < steveCount ? 'steve' : faker.Name.findName()),
        age: (i < babyCount ? 1 : 30),
      });
      // console.log(record);
    }
    
    for (var i = 0; i < todayInLastYearCount; i++) {
      record = table.insertSync({
        date: getTodayInLastYear(),
        name: faker.Name.findName(),
        age: 30
      }); 
      // console.log(record);
    }
  }
  
  before(function (done) {
    utils.clear(PATH, function () {
      can = new Jsoncan(PATH);
      table = can.open('date', schemas);
      addData();
      done();
    });
  });
  

  after(function (done) {
    utils.clear(PATH, done);
  });
  
  it('should exist index file', function (done) {
    var file = table.conn.getTableIndexFile(table.table, 'date');
    // console.log(file);
    fs.exists(file, function (exists) {
      assert.ok(exists);
      done();
    });
  });
  
  
  
  it('test findAllSync', function () {
    var records = table.findAllSync({date: getToday()});
    // console.log(records);
    assert.equal(records.length, todayCount);
  });

  it('test findAll', function (done) {
    table.findAll({date: getToday()}, function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, todayCount);
      done();
    });
  });
  
  it('test findAll, with timestamp', function (done) {
    table.findAll({date: getToday().getTime()}, function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, todayCount);
      done();
    });
  });
  
  it('test findAll with >=', function (done) {
    table.findAll({date: ['>=', getToday()]}, function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, todayCount);
      done();
    });
  });
  
  it('test findAll with <', function (done) {
    table.findAll({date: ['<', getToday()]}, function (e, records) {
      should.not.exists(e);
      assert.ok(records.length, todayInLastYearCount + pastCount);
      done();
    });
  });
  
  it('test findAll by multi index filters', function (done) {
    table.findAll({date: getToday(), name: 'steve'}, function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, steveCount);
      done();
    });
  });

  it('test findAll by mixed filters', function (done) {
    table.findAll({date: getToday(), name: 'steve', age: 1}, function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, babyCount);
      done();
    });
  });
  
  it('test updateAll', function () {
    var records = table.updateAllSync({date: getToday(), name: ['<>', 'steve']}, {name: 'NoneExist'});
    // console.log(records.length);
    assert.equal(table.findAllSync({date: getToday(), name: 'NoneExist'}).length, todayCount - steveCount);
  });

  it('test removeAll', function () {
    table.removeAllSync({date: getToday(), name: 'steve'});
    assert.equal(table.findAllSync({date: getToday()}).length, todayCount - steveCount);
    assert.equal(table.findAllSync({date: getToday(), age: 1}).length, 0);
  });
  

});