var should  = require('should');
var utils   = require('./utils');
var Jsoncan = require('../index');
var mice    = require('mice')('cn');
var path    = require('path');
var PATH    = path.join(__dirname, 'table_text_test');
var fs      = require('fs');
var rander  = require('rander');

describe('test text fields', function () {
  
  var can, Table, firstRecord, textContent;
  
  before(function (done) {
    utils.clear(PATH, function () {
      can = new Jsoncan(PATH);
      done();
    });
  });
  
  after(function (done) {
    utils.clear(PATH, done);
  });
  
  it('basic init a table with text field', function (done) {
    var schemas = {
      id: {
        type: 'random',
        isUnique: true,
        size: 12
      },
      age: {
        type: 'int'
      },
      memo: {
        type: 'text'
      }
    };

    Table = can.open('table1', schemas);

    textContent = mice.paragraphs(10);

    Table.insert({ memo: textContent }, function (e, record) {
      var textFile;
      // console.log(record);
      should.not.exist(e);
      record.should.have.property('memo');
      record.memo.should.match(/[a-f0-9]+/);

      textFile = Table.conn.getTableTextFile(Table.table, record._id, 'memo');
      // console.log(textFile);
      fs.existsSync(textFile).should.be.true;
      firstRecord = record;

      done();
    });
  });

  it('test find', function (done) {

    Table.find(firstRecord._id).exec(function (e, record) {
      should.not.exist(e);
      // console.log(textContent);
      record.should.have.property('memo', textContent);
      done();
    });

  });

  it('test find with select, not select text field', function (done) {

    Table.find(firstRecord._id).select('id').exec(function (e, record) {
      should.not.exist(e);
      // console.log(textContent);
      record.should.have.not.property('memo');
      done();
    });

  });

  it('test find with select, select text field', function (done) {

    Table.find(firstRecord._id).select('memo').exec(function (e, record) {
      should.not.exist(e);
      // console.log(textContent);
      record.should.have.property('memo', textContent);
      record.should.have.not.property('id');
      done();
    });

  });

  it('test findSync', function () {
    var record = Table.find(firstRecord._id).execSync();
    record.should.have.property('id');
    record.should.have.property('memo', textContent);
  });

  it('test findSync with select, not select text field', function () {
    var record = Table.find(firstRecord._id).select('_id', 'id').execSync();
    
    // console.log(record);
    record.should.have.property('id');
    record.should.have.property('_id');
    record.should.not.have.property('memo');
  });

  it('test findSync with select, select text field', function () {
    var record = Table.find(firstRecord._id).select('memo').execSync();
    
    // console.log(record);
    record.should.not.have.property('id');
    record.should.not.have.property('_id');
    record.should.have.property('memo', textContent);

  });  

  it('test update', function (done) {
    textContent = mice.paragraphs(15);

    Table.update(firstRecord._id, {memo: textContent}, function (e, record) {
      should.not.exist(e);
      record.should.have.property('memo');
      record.memo.length.should.equal(40);
      record.memo.should.not.eql(firstRecord.memo);
      done();
    });

  });

  it('check update result', function (done) {
    Table.find(firstRecord._id).exec(function (e, record) {
      should.not.exist(e);
      firstRecord = record;
      record.should.have.property('memo', textContent);
      done();
    });
  });

  it('test update sync', function () {
    textContent = mice.paragraphs(15);

    var record = Table.updateSync(firstRecord._id, {memo: textContent});
    record.should.have.property('memo');
    record.memo.length.should.equal(40);
    record.memo.should.not.eql(firstRecord.memo);

  });

  it('check update sync result', function () {
    firstRecord = Table.find(firstRecord._id).execSync();
    firstRecord.should.have.property('memo', textContent);
  });

  it('test remove', function (done) {

    Table.remove(firstRecord._id, function (e, record) {
      should.not.exist(e);
      record.should.have.property('memo');
      //console.log(record);
      var textFile = Table.conn.getTableTextFile(Table.table, record._id, 'memo');
      // console.log(textFile);
      fs.existsSync(textFile).should.be.false;

      done();
    });

  });

  it('test removeBy', function (done) {
    var record = Table.insertSync({ memo: mice.paragraphs(10)});

    Table.remove(record._id, function (e, record) {
      should.not.exist(e);
      record.should.have.property('memo');
      // console.log(record);
      var textFile = Table.conn.getTableTextFile(Table.table, record._id, 'memo');
      // console.log(textFile);
      fs.existsSync(textFile).should.be.false;

      done();
    });

  });

  it('test remove sync', function () {
    var record = Table.insertSync({ memo: mice.paragraphs(10)});

    record = Table.removeSync(record._id);
    record.should.have.property('memo');
    // console.log(record);
    var textFile = Table.conn.getTableTextFile(Table.table, record._id, 'memo');
    fs.existsSync(textFile).should.be.false;

  });

  it('test removeBy sync', function () {
    var record = Table.insertSync({ memo: mice.paragraphs(10)});

    record = Table.removeBySync('id', record.id);
    record.should.have.property('memo');
    // console.log(record);
    var textFile = Table.conn.getTableTextFile(Table.table, record._id, 'memo');
    fs.existsSync(textFile).should.be.false;

  });

  it('test query/findAll', function (done) {
    var x = 20;
    while(--x >= 0) {
      Table.insertSync({
        memo: mice.paragraphs(10),
        age: rander.dice(10)
      });
    }

    Table.query({age: ['<=', 5]}).exec(function (e, records) {
      should.not.exist(e);
      // console.log(records);
      records.length.should.be.within(0, 20);
      records.forEach(function (record) {
        record.should.have.property('memo');
        record.age.should.be.within(0, 5);
      });
      done();
    });

  });

  it('test query/findAll sync way', function () {
    
    var records = Table.query({age: ['<=', 5]}).execSync();
    records.length.should.be.within(0, 20);
    records.forEach(function (record) {
      record.should.have.property('memo');
      record.age.should.be.within(0, 5);
    });

  });

  it('test removeAll', function (done) {
    var x = 20;

    while(--x >= 0) {
      Table.insertSync({
        age: rander.dice(10)
      });
    }

    var count = Table.countSync({age: ['<=', 5]});

    Table.removeAll({age: ['<=', 5]}, function (e, records) {
      should.not.exist(e);
      records.length.should.equal(count);
      done();
    });

  });

  it('test removeAll sync', function () {
    var count = Table.countSync({age: ['>', 5]});
    var records = Table.removeAllSync({age: ['>', 5]});
    records.length.should.equal(count);

  });

  it('test insertAll', function (done) {
    var records = [];
    var count, x;

    count = x = 50;
    while(--x >= 0) {
      records.push({
        memo: mice.paragraphs(10),
        age: rander.dice(10)
      });
    }

    Table.insertAll(records, function (e, records) {
      should.not.exist(e);
      records.length.should.equal(count);
      done();
    });
  });


  it('test insertAll sync', function () {
    var records = [];
    var count, x;

    count = x = 50;
    while(--x >= 0) {
      records.push({
        memo: mice.paragraphs(10),
        age: rander.dice(10)
      });
    }

    records = Table.insertAllSync(records);
    records.length.should.equal(count);

  });

  it('test updateAll', function (done) {

    Table.updateAll({'age': ['<', 5]}, {memo: mice.paragraphs(10), age: 21}, function (e, records) {
      should.not.exist(e);

      records.forEach(function (record) {
        record.should.have.property('memo');
        record.should.have.property('age', 21);
      });

      done();
    });
  });

  it('test updateAll sync', function () {
    var records = Table.updateAllSync({'age': 21}, {memo: mice.paragraphs(10), age: 22});

    records.forEach(function (record) {
      record.should.have.property('memo');
      record.should.have.property('age', 22);
    });
  });

  it(' table with multiple text fields', function (done) {
    var schemas = {
      id: {
        type: 'random',
        isUnique: true,
        size: 12
      },
      age: {
        type: 'int'
      },
      memo: {
        type: 'text'
      },
      memo2: {
        max: 3000,
        type: 'text'
      },
    };

    Table = can.open('table2', schemas);

    textContent = mice.paragraphs(10);

    Table.insert({ memo: textContent, memo2: textContent.substring(0, 2999) }, function (e, record) {
      var textFile;
      // console.log(record);
      should.not.exist(e);
      record.should.have.property('memo');
      record.memo.should.match(/[a-f0-9]+/);

      record.should.have.property('memo2');
      record.memo2.should.match(/[a-f0-9]+/);

      textFile = Table.conn.getTableTextFile(Table.table, record._id, 'memo');
      fs.existsSync(textFile).should.be.true;

      textFile = Table.conn.getTableTextFile(Table.table, record._id, 'memo2');
      fs.existsSync(textFile).should.be.true;

      done();
    });
  });
  
});