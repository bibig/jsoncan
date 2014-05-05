var should = require('should');
var assert = require('assert');
var Jsoncan = require('../index');
var path = require('path');
var utils = require('./utils');

describe('table.read feature unit test', function () {
  var fields = {
    id: {
      text: 'user id',
      type: 'random',
      format: function (id) {
        return '#' + id;
      }
    },
    age: {
      type: 'int'
    },
    created: {
      text: 'created at',
      type: 'created',
      format: function (d) {
        d = new Date(d);
        return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-');
      }
    }
  };
  var PATH = path.join(__dirname, '_read_test_data');
  var Table;
  
  after(function (done) {
    utils.clear(PATH, done);
  });

  before(function (done) {
    var can = new Jsoncan(PATH);
    Table = can.open('myTable', fields);
    Table.insertAll([{age: 1}, {age: 2}, {age:3}], function (e, records) {
      if (e) console.error(e);
      // console.log(records);
      done();
    });
  });
  
  /*
  it('check findAll()', function (done) {
    Table.findAll(function (e, records) {
      should.not.exist(e);
      console.log(records);
      done();
    });
  });
  */
  
  it('check query.format()', function (done) {
    Table.query().format().exec(function (e, records) {
      should.not.exist(e);
      assert.equal(records[0].id[0], '#');
      done();
    });
  });
  
  it('check query.format(fields, callback)', function (done) {
    Table.query().select('created').format().exec(function (e, records) {
      should.not.exist(e);
      assert.equal(records[0].created.split('-').length, 3);
      done();
    });
  });

  it('check query(options).select(fields).format().exec())', function (done) {
    Table.query({age: 1}).select('created').format().exec(function (e, records) {
      should.not.exist(e);
      assert.equal(records[0].created.split('-').length, 3);
      done();
    });
  });
  
  it('check query().format().execSync()', function () {
    var records = Table.query().format().execSync();
    assert.equal(records[0].id[0], '#');
  });
  
});