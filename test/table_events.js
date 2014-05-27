var should  = require('should');
var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'table_events_test');

describe('test custom event triggers', function () {
  var can ;
  var Table;
  var ListInsert = [];
  var ListUpdate = [];
  var ListRemove = [];
  
  var fields = {
    id: {
      type: 'string',
      max: 8,
      require: true,
      isUnique: true
    },
    name: {
      type: 'string',
      max: 12
    },
    $afterInsert: function (record) {
      ListInsert.push(record);
    },
    $afterUpdate: function (info) {
      ListUpdate.push(info);
      // console.log(info);
    },
    $afterRemove: function (record) {
      // console.log(info);
      ListRemove.push(record);
    }
  };
    
  var tableName = 'autoIncrementTestTable';
  
  
  after(function (done) {
    can.drop(done);
  });
  
  
  it('test create table', function () {
    can = new Jsoncan(PATH);
    Table = can.open(tableName, fields);
    Table.should.be.ok;
  });
  
  it('test insert', function (done) {
    Table.insert({ id: '1', name: 'David' }, function (e, record) {
      should.not.exist(e);
      should(record).eql(ListInsert[0]);
      // console.log(record);
      done();
    });
  });

  it('test insert sync', function () {
    var record = Table.insertSync({ id: '2', name: 'Tom' });

    ListInsert.length.should.eql(2);
    should(record).eql(ListInsert[1]);

  });

  it('test update', function (done) {
    Table.updateBy('id', '1',   {name: 'David II' }, function (e, record) {
      should.not.exist(e);
      should(ListUpdate.length).eql(1);
      should(record).eql(ListUpdate[0][1]);
      should(ListUpdate[0][2]).eql(['name']);
      done();
    });
  });

  it('test update sync', function () {
    var record = Table.updateBySync('id', '1',   {name: 'David III' })

    should(ListUpdate.length).eql(2);
    should(record).eql(ListUpdate[1][1]);
    should(ListUpdate[1][2]).eql(['name']);
    // should(record).eql(ListUpdate[1]);
  });

  it('test remove', function (done) {
    Table.removeBy('id', '1',  function (e, record) {
      should.not.exist(e);
      should(ListRemove.length).eql(1);
      should(record).eql(ListRemove[0]);
      done();
    });
  });

  it('test remove sync', function () {
    var record = Table.removeBySync('id', '2');
    
    should(ListRemove.length).eql(2);
    should(record).eql(ListRemove[1]);
  });  
  
});