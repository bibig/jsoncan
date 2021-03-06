var should  = require('should');
var Jsoncan = require('../index');
var path    = require('path');
var fs      = require('fs');

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
  var PATH = path.join(__dirname, 'table_basic_test');
  var tableName = 'user';
  var can;
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
    can.drop(done);
  });
  
  it('create a Table Object', function () {
    can = new Jsoncan(PATH);
    
    Table = can.open(tableName, fields);
    should(typeof Table == 'object').be.ok;
  });
  
  it('should make table root fold', function () {
    var root = fs.existsSync(path.join(PATH, tableName));
    should(root).be.ok;
  });
  
  it('should create all unique fields folds', function () {
    var emailPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'email'));
    var mobilePath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'mobile'));
    var idPath = fs.existsSync(Table.conn.getTableUniquePath(tableName, 'id'));
    
    should(emailPath).be.ok;
    should(mobilePath).be.ok;
    should(idPath).be.ok;
    
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
    
    should(emailLink).be.ok;
    should(mobileLink).be.ok;
    should(idLink).be.ok;
    
  });
  
  it('primary ids index file should be created', function () {
    var exist = fs.existsSync(Table.conn.getTableIndexFile(tableName, '_id'));
    // console.log(fs.readFileSync(Table.conn.getTableIndexFile(tableName, '_id'), {encoding: 'utf8'}));
    should(exist).be.ok;
  });

  it('test insertAll', function (done) {
    var records = [people2, people3];
    Table.insertAll(records, function (err, list) {
      should.not.exist(err);
      should(list.length == 2).be.ok;
      
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

  // now, three people in db
  it('primary ids should be appended info index file', function () {
    var exist = fs.existsSync(Table.conn.getTableIndexFile(tableName, '_id'));
    var ids = Table.conn.readTableIdIndexFileSync(tableName);
    ids.length.should.equal(3);
    should(exist).be.ok;
  });
  
  
  it('test query skip,limit', function (done) {
    
    Table.query().order('age').skip(2).limit(1).select('name, age').exec(function (e, records) {
      // console.log(records);
      records.length.should.equal(1);
      records[0].name.should.equal('Cici');
      records[0].should.not.have.property('created');
      records[0].should.have.property('name');
      records[0].should.have.property('age');
      done();
    });
  });
  
  /*
  it('test count', function (done) {
    Table.query().exec(function (e, records) {
      should.not.exist(e);
      records.length.should.equal(3);
      done();
    });
  });
  */
  
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
    Table.find(record._id).exec(function (err, data) {
      should.not.exist(err);
      data.should.have.property('id', record.id);
      done();
    });
  });
  
  
  it('test findById', function (done) {
    Table.findBy('id', record.id).exec(function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    });
  });

  it('test findByEmail', function (done) {
    Table.findBy('email', record.email).exec(function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    });
  });
  
  it('test findByMobile', function (done) {
    Table.findBy('mobile', record.mobile).exec(function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    });
  });
  
  it('test query.select', function (done) {
    Table.query(record).select(['id', 'email', 'name']).exec(function (e, records) {
      // console.error(err);
      should.not.exist(e);
      should(records.length == 1).be.ok;
      records[0].should.have.property('id', record.id);
      records[0].should.have.property('email', record.email);
      records[0].should.have.property('name', record.name);
      records[0].should.not.have.property('mobile');
      done();
    });
  });
  
  it('test query with no options', function (done) {
    Table.query().exec(function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      records.length.should.equal(3);
      done();
    });
  });
  
  it('test query with select filter sting', function (done) {
    Table.query().select("id, name").exec(function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      records.length.should.equal(3);
      done();
    });
  });
  
  it('test findAll with select filter array', function (done) {
    Table.query().select(["id", "age"]).exec(function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      records.length.should.equal(3);
      done();
    });
  });
  
  it('test read, deprecated, replaced by format()', function (done) {
    Table.find(record._id).format().exec(function (err, data) {
      var re = /\d{4}\-\d{1,2}\-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}/i;
      should.not.exist(err);
      // data.should.have.property('id', record.id);
      // console.log(data);
      should(re.test(data.modified)).be.ok;
      should(/\$[\d\.]+\*/.test(data.balance)).be.ok;
      done();
    });
  });
  
  it('test query.format', function (done) {
    Table.query().format().exec(function (err, records) {
      // console.error(err);
      should.not.exist(err);
      // console.log(records);
      should(/\$[\d\.]+\*/.test(records[0].balance)).be.ok;
      records.length.should.equal(3);
      done();
    });
  });
  
  it('test query.format with options and fields', function (done) {
    Table.query(record).format().exec(function (err, records) {
      // console.error(err);
      // console.log(records);
      // console.log(records);
      should.not.exist(err);
      should(records.length == 1).be.ok;
      records[0].should.have.property('id', record.id);
      records[0].should.have.property('email', '@' + record.email);
      records[0].should.have.property('name', record.name);
      done();
    });
  });
  
  it('test readBy, deprecated, replaced by format()', function (done) {
    Table.findBy('id', record.id).format().exec(function (err, data) {
      should.not.exist(err);
      data.should.have.property('_id', record._id);
      done();
    });
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

      should( ! oldEmailExists ).be.ok;
      should( ! oldMobileExists ).be.ok;

      should(newEmailExists).be.ok;
      should(newMobileExists).be.ok;

      should(newRecord.modified > record.modified).be.ok;
      newRecord.email.should.equal(email);
      newRecord.mobile.should.equal(mobile);
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
      newRecord.id.should.equal(record.id);
      done();
    });
  });
  
  
  it('test remove', function (done) {
    // console.log('ready to remove %s', record._id);
    // console.log(record);
    Table.remove(record._id, function (err) {
      var primaryIdExists = fs.existsSync(Table.conn.getTableIdFile(tableName, record._id));
      var idExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
      var emailExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
      var mobileExists = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
      
      should.not.exist(err);
      should( ! primaryIdExists ).be.ok;
      should( ! idExists ).be.ok;
      should( ! emailExists ).be.ok;
      should( ! mobileExists ).be.ok;
      
      done();
    });
  });
  
  it('after remove, link files should be deleted', function () {
    var emailLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'email', record.email));
    var mobileLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'mobile', record.mobile));
    var idLink = fs.existsSync(Table.conn.getTableUniqueFile(tableName, 'id', record.id));
    
    should(!emailLink).be.ok;
    should(!mobileLink).be.ok;
    should(!idLink).be.ok;
    
  });
  
  
  it('primary id should be delete in the index file', function () {
    var ids = Table.conn.readTableIdIndexFileSync(tableName);
    // console.log(raw);
    // console.log(ids);
    Object.keys(ids).length.should.equal(2);
  });
  
  // now, remain two people in db
  it('test remove all', function (done) {
    // console.log(Table.findAllSync({age: ['>', 10]}));
    Table.removeAll({age: ['>', 10]}, function (err) {
      should.not.exist(err);
      done();
    });
  });
  
});