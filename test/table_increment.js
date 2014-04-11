var should = require('should');
var assert = require('assert');
var utils = require('./utils');
var Jsoncan = require('../index');
var path = require('path');
var PATH = path.join(__dirname, '_increment_test');
var fs = require('fs');

describe('test increment, decrement features', function () {
  
  var can, table;
  var schemas = {
    name: {
      type: 'string',
      index: true,
      unique: true,
      required: true
    },
    age: {
      type: 'int',
      required: true
    }
  };
  
  function addData () {
    table.insertSync({name: 'David', age: 11});
    table.insertSync({name: 'Nicols', age: 15});
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
  
  
  
  it('test increment', function (done) {
    var people = table.findBy('name', 'David').execSync();
    table.increment(people._id, 'age', function (e, record) {
      should.not.exist(e);
      assert.equal(record.age - people.age, 1);
      done();
    });
  });
  
  it('test increment with step', function (done) {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    table.increment(people._id, 'age', function (e, record) {
      should.not.exist(e);
      assert.equal(record.age - people.age, step);
      done();
    }, step);
  });
  
  it('test decrement', function (done) {
    var people = table.findBy('name', 'David').execSync();
    table.decrement(people._id, 'age', function (e, record) {
      should.not.exist(e);
      assert.equal(people.age - record.age, 1);
      done();
    });
  });
  
  it('test decrement with step', function (done) {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    table.decrement(people._id, 'age', function (e, record) {
      should.not.exist(e);
      assert.equal(people.age - record.age, step);
      done();
    }, step);
  });
  
  // sync
  
  it('test incrementSync', function () {
    var people = table.findBy('name', 'David').execSync();
    var record = table.incrementSync(people._id, 'age');
    assert.equal(record.age - people.age, 1);
  });
  
  it('test incrementSync with step', function () {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    var record = table.incrementSync(people._id, 'age', step);
    assert.equal(record.age - people.age, step);
  });
  
  it('test decrementSync', function () {
    var people = table.findBy('name', 'David').execSync();
    var record = table.decrementSync(people._id, 'age');
    assert.equal(people.age - record.age, 1);
  });
  
  it('test decrementSync with step', function () {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    var record = table.decrementSync(people._id, 'age', step);
    // console.log(record);
    assert.equal(people.age - record.age, step);
  });
  
});