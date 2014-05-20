var should  = require('should');
var Jsoncan = require('../index');
var path    = require('path');
var fs      = require('fs');
var utils   = require('./utils');

describe('test model way', function () {
  var PATH = path.join(__dirname, 'model_test');
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
    should(Gary.validate()).be.ok;
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
  
  it('link files should be created', function () {
    var nameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', people4.name));
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', people4.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', people4.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', Gary.get('id')));
    should(emailLink).be.ok;
    should(mobileLink).be.ok;
    should(idLink).be.ok;
  });

  it('test password validate before insert', function () {
    // console.log(Gary.data);
    should(Gary.isValidPassword('123')).be.ok;
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
      should(Gary.get('age') == newAge).be.ok;
      should(Gary.get('name') == newName).be.ok;
      should(!oldNameLink).be.ok;
      should(newNameLink).be.ok;
      done();
    });
  });
  
  it('test password validate after update', function () {
    // console.log(Gary.data);
    // console.log(Gary.get('password'));
    should(Gary.isValidPassword('123')).be.ok;
  });
  
  it('test insert sync ', function (done) {
    var p1 = Table.create(people1).saveSync();
    var p2 = Table.create(people2).saveSync();
    var p3 = Table.create(people3).saveSync();
    var records = Table.query().execSync();
    should(p1.get('name') == people1.name).be.ok;
    should(p2.get('name') == people2.name).be.ok;
    records.length.should.equal(4);
    should(p1.isValidPassword('123')).be.ok;
    should(p2.isValidPassword('123')).be.ok;
    should(p3.isValidPassword('123')).be.ok;
    done();
  });
  
  it('test load', function () {
    var GaryClone = Table.load(Gary.getPrimaryId());
    should(GaryClone.get('age') == Gary.get('age')).be.ok;
    should(GaryClone.get('email') == Gary.get('email')).be.ok;
    should(GaryClone.isValidPassword('123')).be.ok;
    // console.log(GaryClone.data);
  });
  
  it('test saveSync', function () {
    var oldName = Gary.get('name');
    var newName = people4.name;
    Gary.set('name', newName).saveSync();
    // console.log(Gary.data);
    var oldNameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', oldName));
    var newNameLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'name', newName));
    
    should(newNameLink).be.ok;
    should(!oldNameLink).be.ok;
    should(Gary.isValidPassword('123')).be.ok;
  });
  
  it('test loadBy', function () {
    var GaryClone = Table.loadBy('name', people4.name);
    should(GaryClone.get('age') == Gary.get('age')).be.ok;
    should(GaryClone.get('_id') == Gary.get('_id')).be.ok;
    should(GaryClone.isValidPassword('123')).be.ok;
  });
  
  it('validate failed', function () {
    Gary.set({name: people1.name, email: people2.email}).validate();
    should(Gary.isValid === false).be.ok;
    Gary.messages.should.have.property('name');
    Gary.messages.should.have.property('email');
    // Gary.saveSync();
  });
  
  
  it('test update password', function () {
    var GaryClone = Table.loadBy('name', 'Gary');
    // console.log(GaryClone.get('password'));
    GaryClone.set('password', '234').saveSync();
    // console.log(GaryClone.get('password'));
    should(GaryClone.isValidPassword('234')).be.ok;
  });
  
  it('test read feature', function () {
    var re = /\d{4}\-\d{1,2}\-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}/i;
    var GaryClone = Table.loadBy('name', 'Gary');
    var readData = GaryClone.read();
    // console.log(readData);
    GaryClone.read('email').should.equal('*' + GaryClone.get('email'));
    readData.total.should.equal('$' + 1800.00 );
    should(re.test(GaryClone.read('modified'))).be.ok;
    readData.should.have.property('id', GaryClone.get('id'));
  });
  
  it('remove()', function (done) {
    Gary.remove(function (e) {
      should.not.exist(e);
      Table.findBy('name', 'Gary').exec(function (e, record) {
        should.not.exist(e);
        should(!record).be.ok;
        done();
      });
    });
  });
  
  it('remove all', function (done) {
    Table.removeAll({age: ['>', 0]}, function (e) {
      should.not.exist(e);
      done();
    });
  });

});