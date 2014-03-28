exports.create = create;

var error = require('./error');
var rander = require('rander');
var safepass = require('safepass');

var ValidKeys = [
  'text', 
  'type',
  'isUnique',
  'isNull',
  'isRequired',
  'required', // alias isRequired
  'isInput',
  'shouldAfter', 
  'shouldBefore',
  'length',
  'size', // alias length.
  'max',
  'min',
  'maxValue',
  'minValue',
  'pattern', // regex object.
  'default',
  'format', // a function which format a value for presentation, eg: format date object to 'yyyy-mm-dd' string. 
  'logic', // a function to create value of runtime field.
  'decimals', // for float type.
  'values', // only for enum and map fields.
  'suffix', // for presentation
  'prefix',  // for presentation
  'validate', // a custom validate function, if failed it should return error message directly! passed return null
  'isFake', // for field like 'passwordConfirm', it 's basically same as normal field, except it will never be saved!
  'isReadOnly', // cannot update value after inserted.
  'readOnly', // alias isReadOnly
  'step', // only for 'autoIncrement' type
  'autoIncrement', // only for 'autoIncrement' type
  'isIndex' // is index field
];

var RequiredKeys = ['type'];

// random, created, modified fields do not need to validate, the values are assigned by system.
var ValidTypes = [
  'string',
  'int',
  'float',
  'boolean',
  'autoIncrement', // auto increment id, used with 'autoIncrement' key
  'increment', // autoIncrement alias
  'map',
  'hash', // map alias
  'enum',
  'password',
  'date',
  'datetime',
  'timestamp', // int, like Date.now()
  'created', // created timestamp
  'modified', // modified timestamp
  'text',
  'primary', // _id type
  'random', // alpha number random, default length 8
  'alias', // logic field, should define a logic function to create its value.
  'email',
  'password',
  'url',
  'uuid',
  'alpha',
  'numeric',
  'alphanumeric',
  'ip', // same as ip4
  'ip4',
  'ip6',
  'creditCard',
  'credit card', // same as creditCard
  'object' // array, hash, function ....
];

// 创建schema
function create (fields) {
  // add _id 字段
  fields._id = {
    text: '_id',
    type: 'primary'
  };
  
  checkFields(fields);

  return {
    fields: fields,
    inputFields: inputFields,
    isMap: isMap,
    isAliasField: isAliasField,
    isSystemField: isSystemField,
    mapIdToDesc: mapIdToDesc,
    present: present,
    presentAll: presentAll,
    hasFormat: hasFormat,
    hasUniqueField: hasUniqueField,
    hasAutoIncrementField: hasAutoIncrementField,
    formatField: formatField,
    addPrefixAndSuffix:addPrefixAndSuffix,
    forEachField: forEachField,
    forEachUniqueField: forEachUniqueField,
    forEachIndexField: forEachIndexField,
    precise: precise,
    convertEachField: convertEachField,
    convert: convert,
    addAliasValues: addAliasValues,
    addSystemValues: addSystemValues,
    addDefaultValues: addDefaultValues,
    addValues: addValues,
    getField: getField,
    getPrimaryId: getPrimaryId,
    getTimestamp: getTimestamp,
    getRandom: getRandom,
    isValidType: isValidType,
    isValidPassword: isValidPassword,
    getFieldType: function (name) { return this.fields[name].type; },
    isType: function (name, type) { return this.getFieldType(name) == type; },
    isAutoIncrement: isAutoIncrement,
    isUnique: isUnique,
    isIndex : isIndex,
    isReadOnly: isReadOnly,
    getUniqueFields: getUniqueFields,
    getAutoIncrementValue: null, // need to inject
    getNextAutoIncrementValue: getNextAutoIncrementValue,
    filterData: filterData
  };
}


function getField (v) {
  return typeof v == 'string' ? this.fields[v] : v;
}

// notice: auto increment fields are unique too.
function isUnique (v) {
  var field = this.getField(v);
  return field.isUnique === true || this.isAutoIncrement(v);
}

function isIndex (v) {
  var field = this.getField(v);
  return field.isIndex === true;

}

function isAutoIncrement (v) {
  var field = this.getField(v);
  return field.type === 'increment' || field.type == 'autoIncrement';
}

function isReadOnly (v) {
  var field = this.getField(v);
  return field.isReadOnly || field.readOnly || this.isAutoIncrement(v);
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
  /*
  var keys = Object.keys(field);
  keys.forEach(function (key) {
    if (!isValidKey(key)) {
      throw error.create(1000, key, name);
    }
  });
  */
  
  RequiredKeys.forEach(function (key) {
    if (field[key] == undefined) {
      throw error.create(1001, key, name);
    }
  });
  
  if (!isValidType(field.type)) {
    throw error.create(1002, field.type, name);
  }
}

// 将原始的数据转换为可以放入表示层阅读的数据
function presentAll (data) {
  data = data || {};
  var presentations = {};
  
  this.forEachField(function (name, field, _this) {
    presentations[name] = _this.present(name, data[name], data);
  }, data);
  
  return presentations;
}

function present (name, value, data) {
  if (this.isMap(name)) {
    value = this.mapIdToDesc(name, value);
  }
  
  if (this.hasFormat(name)) {
    value = this.formatField(name, value, data);
  }

  value = this.addPrefixAndSuffix(name, value);

  return value;
}

// 将map字段的值转换为描述文本
function mapIdToDesc (name, value) {
  value = value + '';
  return this.fields[name].values[value];
}

function hasFormat (name) {
  return typeof this.fields[name].format == 'function';
}

function addPrefixAndSuffix(name, value) {
  var field = this.fields[name];
  
  if (field.prefix) {
    value = field.prefix + '' + value;
  }
  
  if (field.suffix) {
    value = value + '' + field.suffix;
  }
  
  return value;
}

// invoke the format function defined in schema.
function formatField (name, value, data) {
  // console.log(arguments);
  return this.fields[name].format(value, data); 
}

function isSystemField (field) {
  return ['primary', 'created', 'modified', 'random'].indexOf(field.type) > -1 || this.isAutoIncrement(field);
}

function isAliasField (field) {
  return field.type == 'alias' && typeof field.logic == 'function';
}

// 是否是map字段
function isMap (name) {
  var field = this.fields[name];
  if (!field) return false;
  return ( field.type == 'hash' || field.type == 'map' ) && field.values;
}

// 获取所有isInput的fields
function inputFields () {
  var fields = {};
  
  this.forEachField(function (name, field, _this) {
    if (field.isInput) {
      fields[name] = field;
      fields[name].name = name;
    }
  });
  
  return fields;
}

function getUniqueFields () {
  var map = {};
  this.forEachUniqueField(function (name, field, _this) {
    map[name] = _this.isAutoIncrement(field) ? ( field.autoIncrement || 1 ) : 0;
  });
  // console.log('in schemas.getUniqueFields()');
  // console.log(map);
  return map;
}

/**
 * 是否有unique字段
 * @return boolean
 */
function hasUniqueField () {
  return Object.keys(this.getUniqueFields()).length > 0;
}

function hasAutoIncrementField () {
  var result = false;
  this.forEachField(function (name, field, _this) {
    if (result) { return; }
    if (_this.isAutoIncrement(field)) { result = true; }
  });
  
  return result;
}

/**
 * 遍历每一个表字段
 * @callback(field name, field object, context)
 */
function forEachField (callback, fields, filter) {
  var _this = this;
  var targets;
  
  if (fields) {
    if (Array.isArray(fields)) {
      targets = fields;
    } else {
      targets = Object.keys(fields);
    }
  } else {
    targets = Object.keys(this.fields);
  }
  
  targets.forEach(function (name) {
    var field = _this.fields[name];
    // field['name'] = name;
    if (typeof filter == 'function') {
      if (!filter(field)) return;
    }
    callback(name, field, _this);
  });
}

function forEachUniqueField (callback, fields) {
  var _this = this;
  this.forEachField(callback, fields, function (field) {
    return _this.isUnique(field);
  });
}

function forEachIndexField (callback, fields) {
  var _this = this;
  this.forEachField(callback, fields, function (field) {
    return _this.isIndex(field);
  });
}

function precise(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * convert value, accoring to the field type
 */
function convertEachField (data, fields) {
  this.forEachField(function (name, field, _this) {
    data[name] = _this.convert(field, data[name]);
  }, fields);
  return data;
}


function convert (field, value) {
  // console.log('convert field: %s = %s', field.type, value);
  // string to date object
  if ((field.type == 'date' || field.type == 'datetime')) {
    if (typeof (value) == 'string') {
      return new Date(value).getTime();
    } else if ( value instanceof Date) {
      return value.getTime();
    }
  }

  if ((field.type == 'int') && typeof (value) == 'string') {
    return parseInt(value, 10);
  }

  if ((field.type == 'float') && typeof (value) == 'string') {
    return precise(value, field.decimals || 2);
  }

  if (field.type == 'password') {
    // console.log('password: %s', value);
    return safepass.hash(value);
  }
  
  return value;
}

// 得到当前时戳
function getTimestamp () {
  return (new Date()).getTime();
}

function getPrimaryId () {
  return require('crypto').randomBytes(20).toString('hex');
}

/** 
 * 获取随机字符串或数字
 * @type: 类型(string or int)
 * @len: 长度
 */
function getRandom (type, len) {
  len = len || 8;  
  switch (type) {
    case 'int':
      return rander.number(len);
    case 'string':
    default:
      return rander.string(len);
  }
}

function addDefaultValues (data) {
  var filtered = {};
  this.forEachField(function (name, field) {
    if (data[name] !== undefined) return; // data中已经设置, 注意可以为空值，null值
    
    if (field.default !== undefined) {
      if (typeof field.default == 'function') {
        data[name] = field.default();
      } else {
        data[name] = field.default;
      }
    } else { // if not set default value then set value to null
      data[name] = null;
    }
  });
  
  return data;
}

function addSystemValues (data) {
  var _this = this;
  
  this.forEachField(function (name, field) {
    switch (field.type) {
      case 'primary':
        if (!data[name]) {
          data[name] = _this.getPrimaryId();
        }
        break;
      case 'random':
        if (!data[name]) {
          data[name] = _this.getRandom();
        }
        break;
      case 'increment':
      case 'autoIncrement':
        // console.log('autoIncrement: %s', _this.getAutoIncrementValue(name));
        if (!data[name]) {
          data[name] = parseInt(_this.getAutoIncrementValue(name) || 1, 10);
        }
        break;
      case 'created':
        if (!data[name]) {
          data[name] = _this.getTimestamp();
        }
        break;
      case 'modified':
        data[name] = _this.getTimestamp();
        break;
    }
  }, null, function (field) {
    return _this.isSystemField(field);
  });
  
  return data;
}

function addAliasValues (data) {
  this.forEachField(function (name, field, _this) {
    data[name] = field.logic(data);
  }, null, function (field) {
    return isAliasField(field);
  });
  
  return data;
}

function addValues (data) {
  data = clone(data); // do not dirty the param data, object param is dangerous.
  data = this.addDefaultValues(data);
  data = this.addSystemValues(data);
  data = this.addAliasValues(data);
  return data;
}

/**
 * filter dirty data, only include those who are defined in schemas
 * @data: ready to save
 */
function filterData (data) {
  var safe = {};
  
  this.forEachField(function (name, field, _this) {
    if (_this.isSystemField(field)) { return; }
    if (data[name] !== undefined) {
      safe[name] = data[name];
    }
  });
  
  return safe;
}

function clone (data) {
  var _data = {};
  
  Object.keys(data).forEach(function (name) {
    _data[name] = data[name];
  });
  
  return _data;
}

/**
 * 检查密码是否正确
 * @hash: 数据库中保存的原值
 * @pass: 要检测的值
 * @return boolean
 */ 

function isValidPassword (hash, pass) {
  return safepass.set(hash).isValid(pass);
}

function getNextAutoIncrementValue (name, currentValue) {
  var step = this.fields[name].step || 1;
  return parseInt(currentValue, 10) + parseInt(step, 10);
}