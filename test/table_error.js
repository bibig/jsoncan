var should  = require('should');
var Jsoncan = require('../index');
var path    = require('path');
var fs      = require('fs');

var fields = {
  id: {
    text: 'user id',
    type: 'random',
    length: 8,
    isUnique: true,
    isReadOnly: true
  },
  email: {
    text: 'your email',
    type: 'string',
    max: 30,
    required: true,
    isUnique: true
  },
  age: {
    text: 'age',
    type: 'int',
    maxValue: 15,
    minValue: 7,
    required: true
  },
  name: {
    text: 'name',
    type: 'string'
  }
};

var PATH = path.join(__dirname, 'table_error_test');
var can = new Jsoncan(PATH);
var Table = can.open('user', fields);

describe('test none exist find, query, count', function () {

  it('find', function (done) {
    Table.find('nonexist').exec(function (e, record) {
      should.not.exist(e);
      should(record).be.not.ok;
      done();
    });
  });

  it('find, sync way', function () {

    (function () {
      var record = Table.find('nonexist').execSync();
    }).should.not.throw();

    var record = Table.find('nonexist').execSync();
    should(record).be.not.ok;
  });

  it('findBy', function (done) {
    Table.findBy('email', 'nonexist').exec(function (e, record) {
      should.not.exist(e);
      should(record).be.not.ok;
      done();
    });
  });

  it('findBy, sync way', function () {

    (function () {
      var record = Table.findBy('email', 'nonexist').execSync();
    }).should.not.throw();

    var record = Table.findBy('id', 'nonexist').execSync();
    should(record).be.not.ok;
  });
  
  it('query', function (done) {
    Table.query().where('age', '>', 10).exec(function (e, records) {
      should.not.exist(e);
      records.should.be.an.Array;
      records.length.should.equal(0);
      done();
    });
  });

  it('query, sync way', function () {

    (function () {
      var records = Table.query().where('age', '>', 15).execSync();
    }).should.not.throw();

    var records = Table.query().where('age', '<', 1).execSync();
    records.should.be.an.Array;
    records.length.should.equal(0);

  });
  
  it('count', function (done) {
    Table.count({'age': ['>', 10]}, function (e, count) {
      should.not.exist(e);
      count.should.equal(0);
      done();
    });
  });

  it('countSync', function () {
    (function () {
      Table.countSync({'age': ['>', 10]});      
    }).should.not.throw();

    var count = Table.countSync({'age': ['>', 10]});
    count.should.equal(0);

  });

});

describe('test wrong field related errors', function () {
  after(function (done) {
    can.drop(done);
  });

  it('query using none exist field', function (done) {
    try {
      Table.query().where('noneExistField', 10).exec();
    } catch (e) {
      should.exist(e);
      e.code.should.eql(1003);
      done();
    }
  });
  
  it('findBy using none unique field', function (done) {
    try {
      Table.findBy('age', 10).execSync();
    } catch (e) {
      // console.error(e);
      should.exist(e);
      e.code.should.eql(1004);
      done();
    }
  });

  it('can open undefined table', function () {
    try {
      can.open('none-exist');
    } catch (e) {
      should.exist(e);
      should(e.code).eql(2000);
    }
  });

});
