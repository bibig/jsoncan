var should = require('should');
var assert = require('assert');
var Schemas = require('../libs/schemas');
var Validator = require('../libs/validator');

var fields = {
    id: {
      text: '用户id',
      type: 'string',
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
      type: 'email',
      max: 30,
      required: true,
      isInput: true,
      isUnique: true
    },
    birthday: {
      text: 'birthday',
      type: 'date'
    },
    url: {
      text: 'website',
      type: 'url'
    },
    card: {
      text: 'credit card',
      type: 'credit card'
    },
    numbers: {
      text: 'my number',
      type: 'numeric'
    },
    ip: {
      text: 'ip',
      type: 'ip'
    },
    uuid: {
     text: 'uuid',
     type: 'uuid'
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
      type: 'created'
    },
    modified: {
      text: '修改日期',
      type: 'modified'
    }
  };
  
var schemas = Schemas.create(fields);

var validator = Validator.create(schemas);

function getData () {
  return {
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
}

describe('test validator.js', function () {
  it('test create', function () {
    var data = getData();
    var check = validator.check(data);
    // console.log(check.getMessages());
    assert.ok(check.isValid());
  });
  
  it('test invalid type', function () {
    var data = getData();
    data.age = 'ab';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('age');
  });
  
  it('test invalid max size', function () {
    var data = getData();
    data.age = 23;
    data.name = 'abcdefghijklmnopqrstuvl';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('name');
  });
  
  it('test invalid min size', function () {
    var data = getData();
    data.name = 'ab';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('name');
  });
  
  it('test invalid fixed size', function () {
    var data = getData();
    data.name = 'david';
    data.id = 'abef';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    // console.log(messages);
    messages.should.have.property('id');
  });
  
  it('test invalid email', function () {
    var data = getData();
    data.email = 'asdf@';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    messages.should.have.property('email');
  });
  
  it('test valid email', function () {
    var data = getData();
    data.email = 'asdf@xxx.com';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(check.isValid());
  });
  
  it('test invalid numbers', function () {
    var data = getData();
    data.numbers = 'asdf@';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    messages.should.have.property('numbers');
  });
  
  it('test valid uuid', function () {
    var data = getData();
    data.uuid = '57b73598-8764-4ad0-a76a-679bb6640eb1';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(check.isValid());
  });
  
   it('test invalid uuid', function () {
    var data = getData();
    data.uuid = 'xxxA987FBC9-4BED-3078-CF07-9141BA07C9F3';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    messages.should.have.property('uuid');
  });
  
  it('test valid ip', function () {
    var data = getData();
    data.ip = '127.0.0.1';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(check.isValid());
  });
  
  it('test invalid ip', function () {
    var data = getData();
    data.ip = '327.0.0.4.1';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
  });
  
  it('test valid date', function () {
    var data = getData();
    data.birthday = '2011-08-04';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(check.isValid());
  });
  
  it('test invalid date', function () {
    var data = getData();
    data.birthday = '32011-s08-04';
    var check = validator.check(data);
    var messages = check.getMessages();
    assert.ok(!check.isValid());
    messages.should.have.property('birthday');
  });  
  
});