var should  = require('should');
var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'table_primary_test');
var fs      = require('fs');

describe('test primary field', function () {
  var can = new Jsoncan(PATH);
  var table;

  after(function (done) {
    can.drop(done);
  });
  
  it('test default _id size', function (done) {
    var schemas = {
      created: {
        type: 'created'
      }
    };

    var Table = can.open('table1', schemas);
    Table.insert({}, function (e, record) {
      should.not.exist(e);
      should(record._id.length).eql(16);
      done();
    });

  });

  it('test custom _id size', function () {
    var schemas = {
      _id: {
        type: 'primary',
        size: 40
      },
      created: {
        type: 'created'
      }
    };

    var Table = can.open('table2', schemas);
    var record = Table.insertSync({});

    // console.log(record);

    should(record._id.length).eql(40);

  });

  
});