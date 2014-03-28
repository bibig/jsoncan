var should = require('should');
var assert = require('assert');
var Jsoncan = require('../index');
var path = require('path');
var fs = require('fs');
var utils = require('./utils');

describe('test model way', function () {
  var PATH = path.join(__dirname, '_data');
  var fields = {
    id: {
      text: 'user id',
      type: 'random',
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
    password: {
      text: 'password',
      type: 'password',
      // type: 'string',
      required: true
    },
    email: {
      text: 'your email',
      type: 'string',
      max: 30,
      required: true,
      isInput: true,
      isUnique: true,
      prefix: '*',
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
    consumed: {
      text: 'consumed money',
      type: 'float',
      decimals: 2,
      isNull: false,
      default: 0.00
    },
    balance: {
      text: 'cash remain',
      type: 'float',
      decimals: 2,
      isNull: false,
      default: 0.00
    },
    total: {
      text: 'total money',
      type: 'alias',
      logic: function (data) {
        return data.consumed + data.balance;
      },
      prefix: '$'
    },
    created: {
      text: 'created at',
      type: 'created'
    },
    modified: {
      text: 'modified at',
      type: 'modified',
      format: function (t) {
        var d = new Date(t);
        return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-') + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].join(':');
      }
    }
  };
  var tableName = 'people';
  var Table;
  var people1 = {
    email: 'tom@hello.com',
    mobile: '18921001800',
    name: 'Tom',
    password: '123',
    age: 18
  };
  var people2 = {
    email: 'david@hello.com',
    mobile: '18911112222',
    name: 'David',
    password: '123',
    age: 22
  };
  var people3 = {
    email: 'cici@hello.com',
    mobile: '18933332222',
    name: 'Cici',
    password: '123',
    age: 26
  };
  var people4 = {
    email: 'gary@hello.com',
    mobile: '218-444-1234',
    name: 'Gary',
    password: '123',
    age: 58,
    balance: 500,
    consumed: 1300,
  };
  var Gary;
  
  before(function (done) {
    var can = new Jsoncan(PATH);
    Table = can.open(tableName, fields);
    Gary = Table.create(people4);
    done();
  });

  after(function (done) {
    utils.clear(PATH, done);
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
      Table.forEachField
      done();
    });
  });
  
  it('link files should be created', function () {
    var nameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', people4.name));
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', people4.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', people4.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', Gary.get('id')));
    assert.ok(emailLink);
    assert.ok(mobileLink);
    assert.ok(idLink);
  });

  it('test password validate before insert', function () {
    // console.log(Gary.data);
    assert.ok(Gary.isValidPassword('123'));
  });
  
  it('test save() for update', function (done) {
    var newAge = 19;
    var newName = 'Garee';
    // console.log(Gary.get('password'));
    Gary.set('age', newAge).set('name', newName).save(function (e, record) {
      var oldNameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', people4.name));
      var newNameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', newName));
      should.not.exist(e);
      record.should.have.property('age',newAge);
      assert.ok(Gary.get('age') == newAge);
      assert.ok(Gary.get('name') == newName);
      assert.ok(!oldNameLink);
      assert.ok(newNameLink);
      done();
    });
  });
  
  it('test password validate after update', function () {
    // console.log(Gary.data);
    // console.log(Gary.get('password'));
    assert.ok(Gary.isValidPassword('123'));
  });
  
  it('test insert sync ', function (done) {
    var p1 = Table.create(people1).saveSync();
    var p2 = Table.create(people2).saveSync();
    var p3 = Table.create(people3).saveSync();
    var records = Table.query().execSync();
    assert.ok(p1.get('name') == people1.name);
    assert.ok(p2.get('name') == people2.name);
    assert.equal(records.length, 4);
    assert.ok(p1.isValidPassword('123'));
    assert.ok(p2.isValidPassword('123'));
    assert.ok(p3.isValidPassword('123'));
    done();
  });
  
  it('test load', function () {
    var GaryClone = Table.load(Gary.getPrimaryId());
    assert.ok(GaryClone.get('age') == Gary.get('age'));
    assert.ok(GaryClone.get('email') == Gary.get('email'));
    assert.ok(GaryClone.isValidPassword('123'));
    // console.log(GaryClone.data);
  });
  
  it('test saveSync', function () {
    var oldName = Gary.get('name');
    var newName = people4.name;
    Gary.set('name', newName).saveSync();
    // console.log(Gary.data);
    var oldNameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', oldName));
    var newNameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', newName));
    
    assert.ok(newNameLink);
    assert.ok(!oldNameLink);
    assert.ok(Gary.isValidPassword('123'));
  });
  
  it('test loadBy', function () {
    var GaryClone = Table.loadBy('name', people4.name);
    assert.ok(GaryClone.get('age') == Gary.get('age'));
    assert.ok(GaryClone.get('_id') == Gary.get('_id'));
    assert.ok(GaryClone.isValidPassword('123'));
  });
  
  it('validate failed', function () {
    Gary.set({name: people1.name, email: people2.email}).validate();
    assert.ok(Gary.isValid === false);
    Gary.messages.should.have.property('name');
    Gary.messages.should.have.property('email');
    // Gary.saveSync();
  });
  
  
  it('test update password', function () {
    var GaryClone = Table.loadBy('name', 'Gary');
    // console.log(GaryClone.get('password'));
    GaryClone.set('password', '234').saveSync();
    // console.log(GaryClone.get('password'));
    assert.ok(GaryClone.isValidPassword('234'));
  });
  
  it('test read feature', function () {
    var re = /\d{4}\-\d{1,2}\-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}/i;
    var GaryClone = Table.loadBy('name', 'Gary');
    var readData = GaryClone.read();
    // console.log(readData);
    assert.equal(GaryClone.read('email'), '*' + GaryClone.get('email'));
    assert.equal(readData.total, '$' + 1800.00 );
    assert.ok(re.test(GaryClone.read('modified')));
    readData.should.have.property('id', GaryClone.get('id'));
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