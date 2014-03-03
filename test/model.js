
var should = require('should');
var assert = require('assert');
var db = require('../index');
var path = require('path');
var fs = require('fs');

describe('test table.js model way', function () {
  
  var fields = {
    id: {
      text: 'user id',
      type: 'string',
      isRandom: true,
      length: 8,
      isUnique: true
    },
    name: {
      text: 'your name',
      type: 'string',
      max: 30,
      required: true,
      isInput: true,
      isUnique: true
    },
    email: {
      text: 'your email',
      type: 'string',
      max: 30,
      required: true,
      isInput: true,
      isUnique: true
    },
    age: {
      text: 'your age',
      type: 'int',
      required: true,
      isInput: true
    },
    mobile: {
      text: 'your mobile number',
      type: 'string',
      max: 20,
      required: true,
      isInput: true,
      isUnique: true
    },
    balance: {
      text: 'cash remain',
      type: 'float',
      decimal: 2,
      isNull: false,
      default: 0.00
    },
    created: {
      text: 'created at',
      type: 'timestamp',
      isTimestamp: true,
      default: Date.now
    },
    modified: {
      text: 'modified at',
      type: 'timestamp',
      isCurrent: true
    }
  };
  var PATH = path.join(__dirname, 'data');
  var tableName = 'people';
  var Table;
  var people1 = {
    email: 'tom@hello.com',
    mobile: '18921001800',
    name: 'Tom',
    age: 18
  };
  var people2 = {
    email: 'david@hello.com',
    mobile: '18911112222',
    name: 'David',
    age: 22
  };
  var people3 = {
    email: 'cici@hello.com',
    mobile: '18933332222',
    name: 'Cici',
    age: 26
  };
  var people4 = {
    email: 'gary@hello.com',
    mobile: '218-444-1234',
    name: 'Gary',
    age: 58
  };
  var Gary;
  
  it('create a Table Object', function () {
    Table = db.table.create(PATH, tableName, fields);
    assert.ok(typeof Table == 'object');
  });
  
  it('test validate', function () {
    Gary = Table.create(people4);
    assert.ok(Gary.validate());
  });
  
  
  it('test save() for insert ', function (done) {
    Gary.save(function (e, record) {
      should.not.exist(e);
      record.should.have.property('name', Gary.get('name'));
      record.should.have.property('email', Gary.get('email'));
      record.should.have.property('age', Gary.get('age'));
      record.should.have.property('created', Gary.get('created'));
      record.should.have.property('modified', Gary.get('modified'));
      record.should.have.property('_id', Gary.getPrimaryId());
      done();
    });
  });
  
  it('test save() for update', function (done) {
    Gary.set('age', 19).save(function (e, record) {
      should.not.exist(e);
      record.should.have.property('age',19);
      done();
    });
  });
  
  it('create more people ', function (done) {
    Table.insertAll([people1, people2, people3], function (e) {
      should.not.exist(e);
      done();
    });
  });
  
  it('test load', function () {
    var GaryClone = Table.load(Gary.getPrimaryId());
    assert.ok(GaryClone.get('age') == Gary.get('age'));
    assert.ok(GaryClone.get('email') == Gary.get('email'));
  });
  
  it('test loadBy', function () {
    var GaryClone = Table.loadBy('name', 'Gary');
    assert.ok(GaryClone.get('age') == Gary.get('age'));
    assert.ok(GaryClone.get('_id') == Gary.get('_id'));
  });
  
  it('validate failed', function () {
    Gary.set({name: people1.name, email: people2.email}).validate();
    assert.ok(Gary.isValid === false);
    Gary.messages.should.have.property('name');
    Gary.messages.should.have.property('email');
  });
  
  it('test model way, remove()', function (done) {
    Gary.remove(function (e) {
      should.not.exist(e);
      Table.findBy('name', 'Gary', function (e, record) {
        should.not.exist(e);
        assert.ok(!record);
        done();
      })
    });
  });
  
  it('remove all', function (done) {
    Table.removeAll({age: ['>', 0]}, function (e) {
      should.not.exist(e);
      done();
    });
  });

});