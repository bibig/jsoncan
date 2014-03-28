var should = require('should');
var assert = require('assert');
var path = require('path');
var Jsoncan = require('../index');
var fs = require('fs');
var utils = require('./utils');

describe('test sync actions in table.js', function () {
  
  
  var PATH = path.join(__dirname, '_data');
  var tableName = 'user';
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
      isInput: true
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
      decimals: 2,
      isNull: false,
      default: 0.00
    },
    created: {
      text: 'created at',
      type: 'created'
    },
    modified: {
      text: 'modified at',
      type: 'modified'
    }
  };
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
  
  var record;
  
  before(function (done) {
    var can = new Jsoncan(PATH);
    Table = can.open(tableName, fields);
    done();
  });
  
  after(function (done) {
    utils.clear(PATH, done);
  });
  
  it('should create all unique fields folds', function () {
    var emailPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'email'));
    var mobilePath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'mobile'));
    var idPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'id'));
    
    emailPath.should.be.ok;
    mobilePath.should.be.ok;
    idPath.should.be.ok;
    
  });
  
  it('test insert', function () {
    record = Table.insertSync(people1);
    record.should.have.property('id');
    record.should.have.property('_id');
    record.should.have.property('email', people1.email);
    record.should.have.property('mobile', people1.mobile);
    record.should.have.property('name', people1.name);
    record.should.have.property('balance', 0.00);
    record.should.have.property('created');
    record.should.have.property('modified');
  });
  
  it('link files should be created', function () {
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    
    assert.ok(emailLink);
    assert.ok(mobileLink);
    assert.ok(idLink);
    
  });

  it('test insertAll', function () {
    var records = [people2, people3];
    var list = Table.insertAllSync(records);
    assert.ok(list.length == 2);
      
    list[0].should.have.property('id');
    list[0].should.have.property('_id');
    list[0].should.have.property('email', people2.email);
    list[0].should.have.property('mobile', people2.mobile);
    list[0].should.have.property('name', people2.name);
    list[0].should.have.property('created');
    list[0].should.have.property('modified');
    
    list[1].should.have.property('id');
    list[1].should.have.property('_id');
    list[1].should.have.property('email', people3.email);
    list[1].should.have.property('mobile', people3.mobile);
    list[1].should.have.property('name', people3.name);
    list[1].should.have.property('created');
    list[1].should.have.property('modified');
  });
  
  
  it('test query skip,limit', function () {
    var list = Table.query().order('age').skip(2).limit(1).select('name, age').execSync();
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Cici');
  });
  
  it('test insert invalid data, validate shoule work', function () {
    try{
      Table.insertSync({});
    } catch (err) {
      should.exist(err);
      // console.log(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('name');
      err.invalidMessages.should.have.property('email');
      err.invalidMessages.should.have.property('mobile');
      err.invalidMessages.should.have.property('age');
    };
  });
  
  it('test insert duplicate', function () {
    try {
      Table.insertSync(people3);
    } catch (err) {
      // console.log(_record);
      should.exist(err);
      // console.log(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('email');
      err.invalidMessages.should.have.property('mobile');
      // console.error(err);
      // console.log(err.code);
      // console.log(err.message);
    }
  });
  
  it('test find', function () {
    var data = Table.findSync(record._id);
    data.should.have.property('id', record.id);
  });
  
  it('test findById', function () {
    var data = Table.findBySync('id', record.id);
    data.should.have.property('_id', record._id);
  });

  it('test findByEmail', function () {
    var data = Table.findBySync('email', record.email);
    data.should.have.property('_id', record._id);
  });
  
  it('test findByMobile', function () {
    var data = Table.findBySync('mobile', record.mobile);
    data.should.have.property('_id', record._id);
  });
  
  it('test query.execSync', function () {
    var records = Table.query(record).select(['id', 'email', 'name']).execSync();
    assert.ok(records.length == 1);
    records[0].should.have.property('id', record.id);
    records[0].should.have.property('email', record.email);
    records[0].should.have.property('name', record.name);
    records[0].should.not.have.property('mobile');
  });
  
  //---read
  it('test read', function () {
    var data = Table.readSync(record._id);
    data.should.have.property('id', record.id);
  });
  
  it('test readBy', function () {
    var data = Table.readBySync('id', record.id);
    data.should.have.property('_id', record._id);
  });
    
  it('test update', function () {
    var email = 'yyy@hello.com';
    var mobile = '1111';
    
    var newRecord = Table.updateSync(record._id, {email: email, mobile: mobile});
    var oldEmailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var oldMobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var newEmailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', newRecord.email));
    var newMobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', newRecord.mobile));
    oldEmailExists.should.not.be.ok;
    oldMobileExists.should.not.be.ok;
    newEmailExists.should.be.ok;
    newMobileExists.should.be.ok;
    assert.ok(newRecord.modified > record.modified);
  });
  
  it('test update duplicate value', function () {
    
    try {
      Table.updateSync(record._id, {mobile: people3.mobile, email: people2.email});
    } catch (err) {
      // console.log(_record);
      should.exist(err);
      // console.log(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('email');
      err.invalidMessages.should.have.property('mobile');
      // console.error(err);
      // console.log(err.code);
      // console.log(err.message);
    }
  });
  
  it('test update all', function () {
    Table.updateAllSync({age: ['>', 20]}, {age: 100});
    assert.equal(Table.query().where('age', 100).execSync().length, 2);
  });
  
  it('test removeSync', function () {
    Table.removeSync(record._id)

    var primaryIdExists = fs.existsSync(Table.conn.getTableIdFile(tableName, record._id));
    var idExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    var emailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
      
    primaryIdExists.should.not.be.ok;
    idExists.should.not.be.ok;
    emailExists.should.not.be.ok;
    mobileExists.should.not.be.ok;
  });
  
  it('after remove, link files should be deleted', function () {
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    
    assert.ok(!emailLink);
    assert.ok(!mobileLink);
    assert.ok(!idLink);
    
  });
  
  it('test remove all', function () {
    Table.removeAllSync({age: ['>', 10]});
    assert.ok(Table.query().execSync().length == 0);
  });
  
  it('test find one none exist', function () {
    record = Table.findBySync('email', 'nonexist');
    assert.ok(!record);
  });
  
  it('test find all none exist', function () {
    records = Table.query({age: ['>', 10]}).execSync();
    assert.ok(records.length == 0);
  });

});