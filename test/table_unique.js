var should  = require('should');
var utils   = require('./utils');

var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'table_unique_test');
var fs      = require('fs');

describe('test unique fields', function () {
  
  var can, table;
  var david;
  var schemas = {
    id: {
      type: 'autoIncrement',
      index: true
    },
    name: {
      type: 'string',
      index: true,
      isUnique: true,
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
    david = table.insertSync({
      name: 'david',
      age: 18
    });
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
  
  it('test validate', function (done) {

    var model = table.model(david);

    model.set('age', 20);
    
    should(model.validate()).be.ok;

    model.save(function (e) {
      should.not.exist(e);
      done();
    });

  });
  
  it('test findby', function () {
    var record = table.findBy('name', 'david').execSync();

    record.age.should.eql(20);
  });

  it('test insert duplicate name', function () {
    table.insert({
      name: 'david',
      age: 10
    }, function (e, record) {
      should.exist(e);
      // console.error(e);
      should(record).not.be.ok;
    });
  });
  
});