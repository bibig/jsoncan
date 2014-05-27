var should  = require('should');
var fs      = require('fs');
var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'auto_increment_test');

describe('test auto-increment field', function () {
  
  var Table;
  
  var fields = {
    id: {
      type: 'autoIncrement',
      autoIncrement: 100,
      step: 5
    },
    name: {
      type: 'string',
      max: 12
    }
  };
    
  var data = {};
  var tableName = 'autoIncrementTestTable';
  var can;
  
  
  after(function (done) {
    can.drop(done);
  });
  
  
  it('test create table', function () {
    can = new Jsoncan(PATH);
    Table = can.open(tableName, fields);
    var autoIncrementFileExists = fs.existsSync(Table.conn.getTableUniqueAutoIncrementFile(tableName, 'id'));
    should(autoIncrementFileExists).be.ok;
  });
  
  it('test first insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      should(record.id).equal(100);
      // console.log(record);
      done();
    });
  });
  
  it('test second insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      record.id.should.equal(105);
      // console.log(record);
      done();
    });
  });
  
  it('test third insert', function (done) {
    Table.insert(data, function (e, record) {
      should.not.exist(e);
      record.id.should.equal(110);
      // console.log(record);
      done();
    });
  });
  
  it('test updateAll', function (done) {
    Table.updateAll({id: ['>', 0]}, {name: 'new name'}, function (e) {
      should.not.exist(e);
      done();
    });
  }); 
  
  it('test query all', function (done) {
    Table.findAll({id: ['>', 0]}).exec(function (e, records) {
      should.not.exist(e);
      records.length.should.equal(3);
      done();
    });
  });
  
  
  it('test findby, auto increment field is unique too', function (done) {
    Table.findBy('id', 100).exec(function (e, record) {
      should.not.exist(e);
      // console.log(record);
      record.should.have.property('id');
      done();
    });
  });
  
});