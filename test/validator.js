var should = require('should');
var assert = require('assert');
var Validator = require('../libs/validator');

var fields = {
    id: {
      text: '用户id',
      type: 'string',
      isRandom: true,
      size: 8,
      isUnique: true
    },
    name: {
      text: '称呼',
      type: 'string',
      max: 10,
      min: 4,
      required: true,
      isInput: true
    },
    email: {
      text: '邮箱',
      type: 'string',
      max: 30,
      required: true,
      isInput: true,
      isUnique: true
    },
    age: {
      text: '年龄',
      type: 'int',
      required: true,
      isInput: true
    },
    mobile: {
      text: '手机',
      type: 'string',
      max: 20,
      required: true,
      isInput: true,
      isUnique: true
    },
    subscribeBegin: {
      text: '认购开始日期',
      type: 'datetime',
      required: true,
      isInput: true
    },
    subscribeEnd: {
      text: '认购结束日期',
      type: 'datetime',
      required: true,
      isInput: true
    },
    created: {
      text: '创建日期',
      type: 'timestamp',
      isTimestamp: true,
      default: Date.now
    },
    modified: {
      text: '修改日期',
      type: 'timestamp',
      isCurrent: true
    }
  };
  
var data = {
    id: '12345678',
    _id: '123abc',
    email: 'david@hello.com',
    mobile: '18911112222',
    name: 'David',
    age: 22,
    subscribeBegin: new Date('2013-2-2'),
    subscribeEnd: new Date('2013-4-4'),
    created: Date.now(),
    modified: Date.now()
  };
var validator = Validator.create(fields);

describe('test validator.js', function () {
  it('test create', function () {
    var check = validator.check(data);
    // console.log(check.getMessages());
    assert.ok(check.isValid());
  });
  
  it('test invalid type', function () {
    data.age = 'ab';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('age');
  });
  
  it('test invalid max size', function () {
    data.age = 23;
    data.name = 'abcdefghijklmnopqrstuvl';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('name');
  });
  
  it('test invalid min size', function () {
    data.name = 'ab';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('name');
  });
  
  it('test invalid fixed size', function () {
    data.name = 'david';
    data.id = 'abef';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('id');
  });
  
  
});