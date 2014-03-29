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
    id: {
      type: 'autoIncrement',
      isIndex: true
    },
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
      table = can.open('myTable', schemas);
      addData();
      done();
    });
  });
  

  after(function (done) {
    utils.clear(PATH, done);
  });

  
  it('should exist index file', function () {
    var file1 = table.conn.getTableIndexFile(table.table, 'id');
    var file2 = table.conn.getTableIndexFile(table.table, 'date');
    assert.ok(fs.existsSync(file1));
    assert.ok(fs.existsSync(file2));
  });
  
  it('test order ascend', function (done) {
    table.query().order('id').exec(function (e, records) {
      should.not.exists(e);
      // console.log(records);
      assert.equal(records[0].id, 1);
      done();
    });
  });
  
  it('test order descend', function (done) {
    table.query().order('id', true).exec(function (e, records) {
      should.not.exists(e);
      // console.log(records);
      assert.equal(records[0].id, pastCount + todayCount + todayInLastYearCount);
      done();
    });
  });
  
  it('test order, skip, limit', function (done) {
    table.query().order('id', true).skip(100).limit(10).exec(function (e, records) {
      should.not.exists(e);
      // console.log(records);
      assert.equal(records[0].id, pastCount + todayCount + todayInLastYearCount - 100);
      assert.equal(records.length, 10);
      done();
    });
  });
  
  it('test query all records', function (done) {
    
    table.query().exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, pastCount + todayCount + todayInLastYearCount);
      done();
    });
  });
  
  it('test query all records sync way', function () {
    var records = table.query().execSync();
    // console.log(records);
    assert.equal(records.length, pastCount + todayCount + todayInLastYearCount);
  });
  
  it('test query().where().exec()', function (done) {
    table.query().where('date', getToday()).exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, todayCount);
      done();
    });
  });
  
  it('test query(filters).exec()', function (done) {
    table.query({date: getToday()}).exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, todayCount);
      done();
    });
  });
  
  it('test query().execSync()', function () {
    var records = table.query({date: getToday()}).execSync();
    var records2 = table.query().where('date', getToday()).execSync();
    // console.log(records);
    assert.equal(records.length, todayCount);
    assert.equal(records2.length, todayCount);
  });
  
  it('test query date by timestamp', function (done) {
    table.query({date: getToday().getTime()}).exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, todayCount);
      done();
    });
  });
  
  it('test query filter with >=', function (done) {
    table.query({date: ['>=', getToday()]}).exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, todayCount);
      done();
    });
  });
  
  
  
  it('test query filter with <', function (done) {
    table.query({date: ['<', getToday()]}).exec(function (e, records) {
      should.not.exists(e);
      assert.ok(records.length, todayInLastYearCount + pastCount);
      done();
    });
  });
  
  
  it('test query filter by multi index filters', function (done) {
    table.query({date: getToday(), name: 'steve'}).exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, steveCount);
      done();
    });
  });
  
  it('test query.where by multi index filters', function (done) {
    table.query()
    .where('date', getToday())
    .where('name', 'steve').exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, steveCount);
      done();
    });
  });

  
  it('test query by mixed filters( including index filters and noneIndex filters)', function (done) {
    table.query({date: getToday(), name: 'steve', age: 1}).exec(function (e, records) {
      should.not.exists(e);
      assert.equal(records.length, babyCount);
      done();
    });
  });
  
  
  
  it('test updateAll', function () {
    var records = table.updateAllSync({date: getToday(), name: ['<>', 'steve']}, {name: 'NoneExist'});
    // console.log(records.length);
    assert.equal(table.query({date: getToday(), name: 'NoneExist'}).execSync().length, todayCount - steveCount);
  });

  it('test removeAll', function () {
    table.removeAllSync({date: getToday(), name: 'steve'});
    assert.equal(table.query({date: getToday()}).execSync().length, todayCount - steveCount);
    assert.equal(table.query({date: getToday(), age: 1}).execSync().length, 0);
  }); 

});