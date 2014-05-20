var should  = require('should');
var utils   = require('./utils');
var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'presentation_test');


var fields = {
    firstName: {
      text: 'first name',
      type: 'string',
      max: 30,
      required: true
    },    
    lastName: {
      text: 'last name',
      type: 'string',
      max: 30,
      required: true
    },
    fullName: {
      text: 'full name',
      type: 'alias',
      logic: function (data) {
        return [data.firstName, data.lastName].join(' ');
      },
      format: function (value, data) {
        // console.log(value);
        if (data.sex == '0') {
          return 'Ms. ' + value; 
        } else {
          return 'Mr. ' + value;
        }
      }
    },
    sex: {
      text: 'sex',
      type: 'map',
      values: {
        '0': 'female',
        '1': 'male'
      },
      required: true
    },
    twitter: {
      text: 'twitter',
      type: 'string',
      max: 30,
      required: true,
      isUnique: true,
      prefix: '@'
    },
    balance: {
      text: 'cash remain',
      type: 'float',
      decimals: 2,
      isNull: false,
      default: 0.00,
      suffix: '元'
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



describe('test presentation', function () {
  
  var Table;
    
  var data = {
    firstName: 'Benjamin',
    lastName: 'Graham',
    sex: '1',
    twitter: 'bg',
    balance: 400.50,
    created: Date.now(),
    modified: Date.now()
  };
  var memberA;
  
  before(function (done) {
    utils.clear(PATH, function () {
      var can = new Jsoncan(PATH);
      Table = can.open('member', fields);
      memberA = Table.create(data);
      done();
    });
  });
  
  after(function (done) {
    utils.clear(PATH, done);
  });
  
  it('test save', function (done) {
    memberA.save(function (e, record) {
      should.not.exist(e);
      done();
    });
    
  });
  
  
  it('test alias field', function () {
    var re = /\d{4}\-\d{1,2}\-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}/i;
    memberA.read('fullName').should.equal('Mr. Benjamin Graham');
    memberA.get('fullName').should.equal('Benjamin Graham');
    should(re.test(memberA.read('modified'))).be.ok;
  });
  
  
  it('test prefix', function () {
    memberA.read('twitter').should.equal('@' + data.twitter);
  });
  
  it('test suffix', function () {
    memberA.read('balance').should.equal(data.balance + '元');
  });
  
  it('test read()', function () {
    var data = memberA.read();
    data.should.have.property('fullName', 'Mr. Benjamin Graham');
  });
  
});