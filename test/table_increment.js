var should  = require('should');
var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'table_increment_test');
var fs      = require('fs');

describe('test increment, decrement features', function () {
  
  var can, table;
  var schemas = {
    name: {
      type     : 'string',
      index    : true,
      unique   : true,
      required : true
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
  
  before(function () {
    can = new Jsoncan(PATH);
    table = can.open('myTable', schemas);
    addData();
  });
  

  after(function (done) {
    can.drop(done);
  });
  
  
  
  it('test increment', function (done) {
    var people = table.findBy('name', 'David').execSync();
    table.increment(people._id, 'age', function (e, record) {
      should.not.exist(e);
      should.equal(record.age - people.age, 1);
      done();
    });
  });
  
  it('test increment with step', function (done) {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    table.increment(people._id, 'age', function (e, record) {
      should.not.exist(e);
      should.equal(record.age - people.age, step);
      done();
    }, step);
  });
  
  it('test decrement', function (done) {
    var people = table.findBy('name', 'David').execSync();
    table.decrement(people._id, 'age', function (e, record) {
      should.not.exist(e);
      should.equal(people.age - record.age, 1);
      done();
    });
  });
  
  it('test decrement with step', function (done) {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    table.decrement(people._id, 'age', function (e, record) {
      should.not.exist(e);
      should.equal(people.age - record.age, step);
      done();
    }, step);
  });
  
  // sync
  
  it('test incrementSync', function () {
    var people = table.findBy('name', 'David').execSync();
    var record = table.incrementSync(people._id, 'age');
    should.equal(record.age - people.age, 1);
  });
  
  it('test incrementSync with step', function () {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    var record = table.incrementSync(people._id, 'age', step);
    should.equal(record.age - people.age, step);
  });
  
  it('test decrementSync', function () {
    var people = table.findBy('name', 'David').execSync();
    var record = table.decrementSync(people._id, 'age');
    should.equal(people.age - record.age, 1);
  });
  
  it('test decrementSync with step', function () {
    var step = 5;
    var people = table.findBy('name', 'Nicols').execSync();
    var record = table.decrementSync(people._id, 'age', step);
    // console.log(record);
    should.equal(people.age - record.age, step);
  });
  
});