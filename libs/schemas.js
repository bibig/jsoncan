exports.create = create;

var error = require('./error');

var ValidKeys = [
  'text', 
  'type',
  'isPrimary',
  'isRandom',
  'isUnique',
  'isNull',
  'isRequired',
  'required', // alias isRequired
  'isInput',
  'isEmail',
  'isUrl',
  'isPassword',
  'isAlpha',
  'isNumeric',
  'isUUID',
  'isURL',
  'isIP',
  'isIP4',
  'isIP6',
  'isCreditCard',
  'isTimestamp', // for created, 一旦发现为空，补上当前时间戳
  'isCurrent', // for modifed， 保存之前，始终赋值为当前时间戳
  'shouldAfter', 
  'shouldBefore',
  'isAlphanumeric',
  'isNumeric',
  'isAlpha',
  'isDate',
  'length',
  'size', // alias length
  'max',
  'min',
  'maxValue',
  'minValue',
  'pattern', // regex object
  'default',
  'format', // for date or datetime, money
  'decimal',
  'values', // only for enum fields
  'suffix', // 后缀
  'prefix'  // 前缀
];

var RequiredKeys = ['text', 'type'];

var ValidTypes = [
  'string',
  'int',
  'float',
  'boolean',
  'map',
  'hash', // map alias
  'enum',
  'date',
  'datetime',
  'timestamp', // 时间戳
  'text',
  'object' // array, hash, function ....
];

// 创建schema
function create (fields) {
  // add _id 字段
  fields._id = {
    text: '_id',
    type: 'string',
    isPrimary: true
  };
  
  checkFields(fields);

  return {
    fields: fields,
    inputFields: inputFields,
    isMap: isMap,
    mapIdToDesc: mapIdToDesc,
    rawToRead: rawToRead
  };
}

function isValidKey (key) {
  return ValidKeys.indexOf(key) > -1;
}

function isValidType (type) {
  return ValidTypes.indexOf(type) > -1;
}

function checkFields (fields) {
  Object.keys(fields).forEach(function (name) {
    checkField(name, fields[name]);
  });
}

function checkField (name, field) {
  var keys = Object.keys(field);
  keys.forEach(function (key) {
    if (!isValidKey(key)) {
      throw error.create(1000, key, name);
    }
  });
  
  RequiredKeys.forEach(function (key) {
    if (field[key] == undefined) {
      throw error.create(1001, key, name);
    }
  });
  
  if (!isValidType(field.type)) {
    throw error.create(1003, field.type, name);
  }
}

// 将原始的数据转换为可以放入表示层阅读的数据，主要是为map字段准备
function rawToRead (data) {
  // console.log(data);
  var keys = Object.keys(data);
  var _this = this;
  keys.forEach(function (name) {
    if (_this.isMap(name)) {
      data[name] = _this.mapIdToDesc(name, data[name]);
    } 
  });
  return data;
}

// 将map字段的值转换为描述文本
function mapIdToDesc (name, value) {
  // console.log(this.schemas);
  return this.fields[name].values[parseInt(value, 10)];
}

// 是否是map字段
function isMap (name) {
  var field = this.fields[name];
  if (!field) return false;
  // console.log('name: %s', name);
  // console.log(field);
  return ( field.type == 'hash' || field.type == 'map' ) && field.values;
}

// 获取所有isInput的fields
function inputFields () {
  var fields = {};
  var _this = this;
  Object.keys(this.fields).forEach(function (name) {
    var field = _this.fields[name];
    field.name = name;
    if (field.isInput) {
      fields[name] = field;
    }
  });
  
  return fields;
}
