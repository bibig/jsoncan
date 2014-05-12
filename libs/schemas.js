exports.create = create;

var yi       = require('yi');
var error    = require('./error');
var rander   = require('rander');
var safepass = require('safepass');
/*
var ValidKeys = [
  'text', 
  'type',
  'isUnique',
  'unique', // alias isUnique
  'isNull',
  'null', // alias isNull
  'isRequired',
  'required', // alias isRequired
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
  'fake', // alias for isFake
  'isReadOnly', // cannot update value after inserted.
  'readOnly', // alias for isReadOnly
  'step', // only for 'autoIncrement' type
  'autoIncrement', // only for 'autoIncrement' type
  'isIndex', // is index field
  'index',  // alias for isIndex
  'counter' // counter name
];
*/
var RequiredKeys = ['type'];
// random, created, modified fields do not need to validate, the values are assigned by system.
var ValidTypes = [
  'string',
  'int',
  'float',
  'boolean',
  'autoIncrement', // auto increment id, used with 'autoIncrement' key
  'increment', // autoIncrement alias
  'enum',
  'map',
  'hash', // map alias
  'array',
  'password',
  'date',
  'datetime',
  'timestamp', // int, like Date.now()
  'created', // created timestamp
  'modified', // modified timestamp
  'text',
  'ref', // reference
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


var Schemas = function (fields) {
  fields._id = {
    text: '_id',
    type: 'primary'
  };
  
  this.fields                = fields;
  this.getAutoIncrementValue = null; // need to inject
};

function create (fields) {
  checkFields(fields);
  // console.log(fields);
  return new Schemas(fields);
}

Schemas.prototype.getFieldType = function (name) { 
  return this.fields[name].type; 
};

Schemas.prototype.hasCounter = function (fields) {
  var self = this;
  var has = false;
  
  this.forEachField(function (name, field) {

    if (!has) {
      has = self.isCounter(field);
    }

  }, fields);
  
  return has;
};

Schemas.prototype.getCounters = function () {
  var self = this;
  var targets = [];
  
  this.forEachField(function (name, field) {
    
    if (self.isCounter(field)) {
      targets.push([name, field.counter]);
    }

  });
  
  return targets;
};

Schemas.prototype.isType = function (name, type) { 
  return this.getFieldType(name) == type; 
};

Schemas.prototype.getField = function (v) {
  return typeof v == 'string' ? this.fields[v] : v;
};

Schemas.prototype.getReference = function (name) {
  var field = this.getField(name);
  // console.log(field.ref);
  return field.ref;
};

Schemas.prototype.isField = function (name) {
  return typeof this.fields[name] !== 'undefined';
};

// notice: auto increment fields are unique too.
Schemas.prototype.isUnique = function (v) {
  var field = this.getField(v);

  return field.unique === true || field.isUnique === true || this.isAutoIncrement(v);
};

Schemas.prototype.isCounter = function (v) {
  var field = this.getField(v);

  return field.type === 'ref' && typeof field.counter === 'string' && field.counter !== '';
};

Schemas.prototype.isIndex = function (v) {
  var field = this.getField(v);

  return field.isIndex === true || field.index === true;
};

Schemas.prototype.isAutoIncrement = function (v) {
  var field = this.getField(v);

  return field.type === 'increment' || field.type == 'autoIncrement';
};

Schemas.prototype.isReadOnly = function (v) {
  var field = this.getField(v);

  return field.isReadOnly || field.readOnly || this.isAutoIncrement(v);
};

Schemas.prototype.isSystemField = function (field) {
  return ['primary', 'created', 'modified', 'random'].indexOf(field.type) > -1 || this.isAutoIncrement(field);
};

Schemas.prototype.isAliasField = function (field) {
  return field.type == 'alias' && typeof field.logic == 'function';
};

// 是否是map字段
Schemas.prototype.isMap = function (name) {
  var field = this.fields[name];

  if (!field) return false;

  return ( field.type == 'hash' || field.type == 'map' ) && field.values;
};

Schemas.prototype.isEnum = function (name) {
  var field = this.fields[name];

  if (!field) return false;
  // return ( field.type == 'enum') && Array.isArray(field.values);
  if (field.type == 'enum') {

    if (typeof field.values == 'string') {
      return field.values.split(',').length > 0;
    }

    return Array.isArray(field.values);
  }
  return false;
};

Schemas.prototype.isArray = function (name) {
  var field = this.fields[name];

  if (!field) return false;

  return ( field.type == 'array') && Array.isArray(field.values);
};

// 将原始的数据转换为可以放入表示层阅读的数据
Schemas.prototype.presentAll = function (data) {
  var presentations = {
    _raw: {}
  };

  data = data || {};

  this.forEachField(function (name, field, self) {
    var value        = data[name];
    var presentValue = self.present(name, value, data);

    presentations[name] = presentValue;

    if (value != presentValue) {
      presentations._raw[name] = value;
    }

  }, Object.keys(data));

  return presentations;
};

Schemas.prototype.present = function (name, value, data) {
  
  if (value === null || value === '' || value === undefined) {
    return '';
  }

  if (this.isMap(name)) {
    value = this.mapIdToDesc(name, value);
  }
  
  if (this.isArray(name)) {
    value = this.arrayIdToDesc(name, value);
  }
  
  if (this.hasFormat(name)) {
    value = this.formatField(name, value, data);
  }

  value = this.addPrefixAndSuffix(name, value);

  return value;
};

// 将map字段的值转换为描述文本
Schemas.prototype.mapIdToDesc = function (name, value) {
  value = value + '';

  return this.fields[name].values[value];
};

Schemas.prototype.arrayIdToDesc = function (name, value) {
  value = parseInt(value, 10);

  return this.fields[name].values[value];
};

Schemas.prototype.hasFormat = function (name) {
  return typeof this.fields[name].format == 'function';
};

Schemas.prototype.addPrefixAndSuffix = function (name, value) {
  var field = this.fields[name];
  
  if (field.prefix) {
    value = field.prefix + '' + value;
  }
  
  if (field.suffix) {
    value = value + '' + field.suffix;
  }
  
  return value;
};

// invoke the format function defined in schema.
Schemas.prototype.formatField = function (name, value, data) {
  // console.log(arguments);
  return this.fields[name].format(value, data); 
};

Schemas.prototype.getUniqueFields = function () {
  var map = {};

  this.forEachUniqueField(function (name, field, self) {
    map[name] = self.isAutoIncrement(field) ? ( field.autoIncrement || 1 ) : 0;
  });

  return map;
};

/**
 * 是否有unique字段
 * @return boolean
 */
Schemas.prototype.hasUniqueField = function () {
  return Object.keys(this.getUniqueFields()).length > 0;
};

Schemas.prototype.hasAutoIncrementField = function () {
  var result = false;

  this.forEachField(function (name, field, self) {

    if (result) { return; }

    if (self.isAutoIncrement(field)) { result = true; }

  });
  
  return result;
};

/**
 * 遍历每一个表字段
 * @callback(field name, field object, context)
 */
Schemas.prototype.forEachField = function (callback, fields, filter) {
  var self = this;
  var targets;

  if (Array.isArray(fields)) {
    targets = fields;
  } else if ( fields && yi.isPlainObject(fields) ) {
    targets = Object.keys(fields);
  } else {
    targets = Object.keys(this.fields);
  }
  
  targets.forEach(function (name) {
    var field = self.fields[name];

    if (typeof field === 'undefined') return;

    if (typeof filter === 'function') {

      if (!filter(field)) return;

    }

    callback(name, field, self);
  });

};

Schemas.prototype.forEachUniqueField = function (callback, fields) {
  var self = this;

  this.forEachField(callback, fields, function (field) {
    return self.isUnique(field);
  });

};

Schemas.prototype.forEachIndexField = function (callback, fields) {
  var self = this;

  this.forEachField(callback, fields, function (field) {
    return self.isIndex(field);
  });
};

/**
 * remove all the fake fields data
 * @data, ready to save
 */

Schemas.prototype.clearFakeFields = function (data) {
  var noFake = {};

  this.forEachField(function (name, field, self) {
    noFake[name] = data[name];
  }, Object.keys(data), function (field) {
    return ! (field.isFake || field.fake);
  });
  
  return noFake;
};



/**
 * convert value for json file, accoring to the field type
 */
Schemas.prototype.convertEachField = function (data, fields) {

  this.forEachField(function (name, field, self) {
    data[name] = self.convert(field, data[name]);
  }, fields);

  return data;
};

/**
 * convert for json file
 */
Schemas.prototype.convert = function (field, value) {
  // console.log('convert field: %s = %s', field.type, value);
  // string to date object
  if ((field.type == 'date' || field.type == 'datetime')) {

    if (typeof (value) == 'string') {
      return new Date(value).getTime();
    } else if ( value instanceof Date) {
      return value.getTime();
    }

  }

  if ((field.type == 'int' || field.type == 'array') && typeof (value) == 'string') {
    return parseInt(value, 10);
  }

  if ((field.type == 'float') && typeof (value) == 'string') {
    return precise(value, field.decimals || 2);
  }

  if (field.type == 'password') {
    return safepass.hash(value);
  }
  
  if (field.type == 'boolean' && typeof value != 'boolean') {
    return value === 1 || value === '1' || value === 'on' || value === 'true';
  }
  
  if (field.type === 'ref') {

    if (typeof value === 'object') {
      return value._id;
    }

  }
  
  return value;
};

/**
 * convert back from json
 */
Schemas.prototype.convertBackEachField = function (data) {

  this.forEachField(function (name, field, self) {
    data[name] = self.convertBack(field, data[name]);
  }, Object.keys(data));

  return data;
};

Schemas.prototype.convertBack = function (field, value) {
  
  if ((field.type === 'date' || field.type === 'datetime')) {
  
    if (typeof value === 'number' ) {
      return new Date(value);
    }

  }

  return value;
};

// convert string to fited type
Schemas.prototype.fieldValueConvertFn = function (field) {
  field = this.getField(field);

  switch (field.type) {
    case 'int':
    case 'autoIncrement':
    case 'increment':
    case 'date':
    case 'datetime':
    case 'created':
    case 'modified':
      return function (s) { return parseInt(s, 10); };
    case 'float':
      return function (s) { return parseFloat(s); };
    default:
      return function (s) { return s; };
  }

};

// 得到当前时戳
Schemas.prototype.getTimestamp = function () {
  return (new Date()).getTime();
};

Schemas.prototype.getPrimaryId = function () {
  return require('crypto').randomBytes(20).toString('hex');
};

/** 
 * 获取随机字符串或数字
 * @type: 类型(string or int)
 * @len: 长度
 */
Schemas.prototype.getRandom = function (len) {
  len = len || 8;

  return rander.string(len);
};

Schemas.prototype.addDefaultValues = function (data, fields) {
  var filtered = {};

  this.forEachField(function (name, field) {
    
    if (data[name] !== undefined && data[name] !== null && data[name] !== '') return; // data中已经设置, 注意空值，null值均视为未设置
    
    if (field.default !== undefined && field.default !== null && field.default !== '') {
      
      if (typeof field.default === 'function') {
        data[name] = field.default();
      } else {
        data[name] = field.default;
      }

    } else { // if not set default value then set value to null
      // data[name] = null;
    }
  }, fields);

  return data;
};

Schemas.prototype.addSystemValues = function (data) {
  var self = this;
  
  this.forEachField(function (name, field) {
  
    switch (field.type) {
      case 'primary':
  
        if (!data[name]) {
          data[name] = self.getPrimaryId();
        }

        break;
      case 'random':
        
        if (!data[name]) {
          data[name] = self.getRandom(field.size);
        }

        break;
      case 'increment':
      case 'autoIncrement':
        // console.log('autoIncrement: %s', self.getAutoIncrementValue(name));
        
        if (!data[name]) {
          data[name] = parseInt(self.getAutoIncrementValue(name) || 1, 10);
        }

        break;
      case 'created':

        if (!data[name]) {
          data[name] = self.getTimestamp();
        }

        break;
      case 'modified':
        data[name] = self.getTimestamp();
        break;
    }
  }, null, function (field) {
    return self.isSystemField(field);
  });
  
  return data;
};

Schemas.prototype.addAliasValues = function (data) {
  var self = this;
  
  this.forEachField(function (name, field, self) {
    data[name] = field.logic(data);
  }, null, function (field) {
    return self.isAliasField(field);
  });
  
  return data;
};

Schemas.prototype.addValues = function (data) {
  data = clone(data); // do not dirty the param data, object param is dangerous.
  data = this.addDefaultValues(data);
  data = this.addSystemValues(data);
  data = this.addAliasValues(data);
  
  return data;
};

/**
 * filter dirty data, only include those who are defined in schemas
 * @data: ready to save
 */
Schemas.prototype.filterData = function (data) {
  var safe = {};
  
  this.forEachField(function (name, field, self) {
    
    if (self.isSystemField(field)) { return; }
    
    if (data[name] !== undefined) {
      safe[name] = data[name];
    }

  });
  
  return safe;
};



/**
 * 检查密码是否正确
 * @hash: 数据库中保存的原值
 * @pass: 要检测的值
 * @return boolean
 */ 

Schemas.prototype.isValidPassword = function (hash, pass) {
  return safepass.set(hash).isValid(pass);
};

Schemas.prototype.getNextAutoIncrementValue = function (name, currentValue) {
  var step = this.fields[name].step || 1;
  return parseInt(currentValue, 10) + parseInt(step, 10);
};

Schemas.prototype.getChangedFields = function (data, record) {
  var fields = [];
  this.forEachField(function (name, field, self) {
    
    if (self.isReadOnly(field)) { return; }
    
    if (data[name] === undefined) { return; }
    
    if (data[name] != record[name]) {
      fields.push(name);
    }

  }, Object.keys(data));

  return fields;
};

/** 
 * 无论是sync or async都要处理的部分
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @data: 要保存的数据
 * @record: 当前数据库中的数据
 */ 
Schemas.prototype.getRealUpdateData = function (data, record) {
  var target = {}; // 避免data中夹杂schemas没有定义的数据
  
  this.forEachField(function (name, field) {
    
    if (data[name] === undefined) {
      target[name] = record[name];
    } else {
      target[name] = data[name];
    }

  });
  
  return this.addValues(target);
};

function isValidType (type) {
  return ValidTypes.indexOf(type) > -1;
}

function checkFields (fields) {
  
  Object.keys(fields).forEach(function (name) {
    checkField(name, fields[name]);
  });

}

Schemas.prototype.isValidType = isValidType;

function checkField (name, field) {  
  
  RequiredKeys.forEach(function (key) {
  
    if (field[key] === undefined) {
      throw error(1001, key, name);
    }

  });
  
  if (!isValidType(field.type)) {
    throw error(1002, field.type, name);
  }
  
}

function precise(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function clone (data) {
  var _data = {};
  
  Object.keys(data).forEach(function (name) {
    _data[name] = data[name];
  });
  
  return _data;
}