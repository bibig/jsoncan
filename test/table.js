var should = require('should');
var assert = require('assert');
var Jsoncan = require('../index');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

describe('test table.js', function () {
  
  var fields = {
    id: {
      text: 'user id',
      type: 'random',
      length: 8,
      isUnique: true,
      isReadOnly: true
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
      isUnique: true,
      prefix: '@'
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
      default: 0.00,
      prefix: '$',
      suffix: '*'
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
      },
    }
  };
  var PATH = path.join(__dirname, '_data');
  var tableName = 'user';
  var Table;
  var people1 = {
    email: 'tom@hello.com',
    mobile: 'tom_mobile',
    name: 'Tom',
    age: 18
  };
  
  var people2 = {
    email: 'david@hello.com',
    mobile: 'david_mobile',
    name: 'David',
    age: 22
  };
  
  var people3 = {
    email: 'cici@hello.com',
    mobile: 'cici_mobile',
    name: 'Cici',
    age: 26
  };
  
  var record;
  
  after(function (done) {
    var command = 'rm -rf ' + PATH;
    exec(command, function(err, stdout, stderr) {
      done();
    });
  });
  
  it('create a Table Object', function () {
    var can = new Jsoncan(PATH);
    Table = can.open(tableName, fields);
    assert.ok(typeof Table == 'object');
  });
  
  it('should make table root fold', function () {
    var root = fs.existsSync(path.join(PATH, tableName));
    root.should.be.ok;
  });
  
  it('should create all unique fields folds', function () {
    var emailPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'email'));
    var mobilePath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'mobile'));
    var idPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'id'));
    
    emailPath.should.be.ok;
    mobilePath.should.be.ok;
    idPath.should.be.ok;
    
  });
  
  it('test insert', function (done) {
    Table.insert(people1, function (err, _record) {
      // console.log(err);
      record = _record;
      should.not.exist(err);
      record.should.have.property('id');
      record.should.have.property('_id');
      record.should.have.property('email', people1.email);
      record.should.have.property('mobile', people1.mobile);
      record.should.have.property('name', people1.name);
      record.should.have.property('balance', 0.00);
      record.should.have.property('created');
      record.should.have.property('modified');
      done();
    });
  });
  
  it('link files should be created', function () {
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    
    assert.ok(emailLink);
    assert.ok(mobileLink);
    assert.ok(idLink);
    
  });

  it('test insertAll', function (done) {
    var records = [people2, people3];
    Table.insertAll(records, function (err, list) {
      should.not.exist(err);
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
      done();
    });
  });
  
  it('test count', function (done) {
    Table.createQuery(function (err, query) {
      should.not.exist(err);
      assert.ok(query.count() == 3);
      done();
    });
  })
  
  it('test query skip,limit', function (done) {
    Table.createQuery(function (err, query) {
      should.not.exist(err);
      var list = query.order('age').skip(2).limit(1).select('name, age');
      // console.log(list);
      assert.ok(list.length==1);
      assert.ok(list[0].name == 'Cici');
      done();
    });
  });
  
  it('test insert invalid data, validate shoule work', function (done) {
    Table.insert({}, function (err, _record) {
      // console.log(_record);
      should.exist(err);
      // console.log(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('name');
      err.invalidMessages.should.have.property('email');
      err.invalidMessages.should.have.property('mobile');
      err.invalidMessages.should.have.property('age');
      // console.error(err);
      // console.log(err.code);
      // console.log(err.message);
      done();
    });
  });
  
  it('test insert duplicate', function (done) {
    Table.insert(people3, function (err, _record) {
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
      done();
    });
  });
  
  it('test find', function (done) {
    Table.find(record._id, function (err, data) {
      should.not.exist(err);
      data.should.have.property('id', record.id);
      done();
    });
  });
  
  
  it('test findById', function (done) {
    Table.findBy('id', record.id, function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    })
  });

  it('test findByEmail', function (done) {
    Table.findBy('email', record.email, function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    })
  });
  
  it('test findByMobile', function (done) {
    Table.findBy('mobile', record.mobile, function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    })
  });
  
  it('test findAll', function (done) {
    Table.findAll(record, ['id', 'email', 'name'], function (err, records) {
      // console.error(err);
      should.not.exist(err);
      assert.ok(records.length == 1);
      records[0].should.have.property('id', record.id);
      records[0].should.have.property('email', record.email);
      records[0].should.have.property('name', record.name);
      records[0].should.not.have.property('mobile');
      done();
    });
  });
  
  it('test findAll with no options', function (done) {
    Table.findAll(function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      assert.equal(records.length, 3);
      done();
    });
  });
  
  it('test findAll with select filter sting', function (done) {
    Table.findAll("id, name", function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      assert.equal(records.length, 3);
      done();
    });
  });
  
  it('test findAll with select filter array', function (done) {
    Table.findAll(["id", "age"], function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      assert.equal(records.length, 3);
      done();
    });
  });
  
  it('test read', function (done) {
    Table.read(record._id, function (err, data) {
      var re = /\d{4}\-\d{1,2}\-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}/i;
      should.not.exist(err);
      data.should.have.property('id', record.id);
      // console.log(data);
      assert.ok(re.test(data.modified));
      assert.ok(/\$[\d\.]+\*/.test(data.balance));
      done();
    });
  });
  
  it('test readAll', function (done) {
    Table.readAll(null, function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      assert.equal(records.length, 3);
      done();
    });
  });
  
  it('test readAll with options and fields', function (done) {
    Table.readAll(record, function (err, records) {
      // console.error(err);
      // console.log(records);
      // console.log(records);
      should.not.exist(err);
      assert.ok(records.length == 1);
      records[0].should.have.property('id', record.id);
      records[0].should.have.property('email', '@' + record.email);
      records[0].should.have.property('name', record.name);
      done();
    });
  });
  
  it('test readBy', function (done) {
    Table.readBy('id', record.id, function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    })
  });

  
  it('test update', function (done) {
    var email = 'tom@xxx.com';
    var mobile = 'tom_mobile2';
    // console.log('old record');
    // console.log(record);
    Table.update(record._id, {email: email, mobile: mobile}, function (err, newRecord) {
      // console.log('new record');
      // console.log(newRecord);
      should.not.exist(err);
      // console.log(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
      // console.log(Table.conn.getTableUniqueFile(tableName, 'email', email));
      var oldEmailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
      var oldMobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
      var newEmailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', newRecord.email));
      var newMobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', newRecord.mobile));
      oldEmailExists.should.not.be.ok;
      oldMobileExists.should.not.be.ok;
      newEmailExists.should.be.ok;
      newMobileExists.should.be.ok;
      assert.ok(newRecord.modified > record.modified);
      assert.equal(newRecord.email, email);
      assert.equal(newRecord.mobile, mobile);
      done();
    });
  });
  
  it('test update duplicate value', function (done) {
    Table.update(record._id, {mobile: people3.mobile, email: people2.email}, function (err, newRecord) {
      // console.log(newRecord);
      // console.log(err);
      should.exist(err);
      err.should.have.property('code');
      err.should.have.property('invalidMessages');
      err.should.have.property('invalid', true);
      err.invalidMessages.should.have.property('email');
      done();
    });
  });
  
  it('test update all', function (done) {
    Table.updateAll({age: ['>', 20]}, {age: 100}, function (err) {
      should.not.exist(err);
      done();
    });
  });
  
  it('test cannot update readonly fields', function (done) {
    Table.update(record._id, {id: '111'}, function (err, newRecord) {
      should.not.exist(err);
      assert.equal(newRecord.id, record.id);
      done();
    });
  });
  
  
  it('test remove', function (done) {
    Table.remove(record._id, function (err) {
      // console.log(Table.conn.getTableIdFile(tableName, ));
      var primaryIdExists = fs.existsSync(Table.conn.getTableIdFile(tableName, record._id));
      var idExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
      var emailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
      var mobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
      
      should.not.exist(err);
      primaryIdExists.should.not.be.ok;
      idExists.should.not.be.ok;
      emailExists.should.not.be.ok;
      mobileExists.should.not.be.ok;
      
      done();
    });
  });
  
  it('after remove, link files should be deleted', function () {
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    
    assert.ok(!emailLink);
    assert.ok(!mobileLink);
    assert.ok(!idLink);
    
  });
  
  it('test remove all', function (done) {
    Table.removeAll({age: ['>', 10]}, function (err) {
      should.not.exist(err);
      done();
    });
  });
  
  it('test find one none exist', function (done) {
    Table.findBy('email', 'nonexist', function (err, data) {
      should.not.exist(err);
      assert.ok(!data);
      done();
    })
  });
  
  it('test find all none exist', function (done) {
    Table.findAll({age: ['>', 10]}, function (err, data) {
      should.not.exist(err);
      done();
    })
  });
});