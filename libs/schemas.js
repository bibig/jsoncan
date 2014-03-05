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
  // 'isPassword', deprecated, it's not a database business logic.
  'isAlpha',
  'isNumeric',
  'isUUID',
  'isURL',
  'isIP',
  'isIP4',
  'isIP6',
  'isCreditCard',
  'isTimestamp', // for field like 'created', if no value found, it will be set to current timestamp when saving.
  'isCurrent', // for field like 'modifed', always set to current timestamp when saving. 
  'shouldAfter', 
  'shouldBefore',
  'isAlphanumeric',
  'isNumeric',
  'isAlpha',
  'isDate',
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
  'values', // only for enum fields.
  'suffix', // for presentation
  'prefix',  // for presentation
  'validate', // a custom validate function, if failed it should return error message directly! passed return null
  'isFake' // for field like 'passwordConfirm', it 's basically same as normal field, except it will never be saved!
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
  'timestamp', // int, like Date.now()
  'text',
  'alias', // logic field, should define a logic function to create its value.
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
    read: read, // read a field
    rawToRead: rawToRead,
    hasFormat: hasFormat,
    hasUniqueField: hasUniqueField,
    format: format,
    addPrefixAndSuffix:addPrefixAndSuffix,
    forEachField: forEachField,
    precise: precise
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

// 将原始的数据转换为可以放入表示层阅读的数据
function rawToRead (data) {
  var keys = Object.keys(this.fields);
  data = data || {};
  var presentations = {};
  
  this.forEachField(function (name, field, _this) {
    presentations[name] = _this.read(name, data[name], data);
  });
  
  return presentations;
}

function read (name, value, data) {
  if (this.isMap(name)) {
    value = this.mapIdToDesc(name, value);
  }
  
  if (this.hasFormat(name)) {
    value = this.format(name, value, data);
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
function format (name, value, data) {
  // console.log(arguments);
  return this.fields[name].format(value, data); 
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

/**
 * 是否有unique字段
 * @return boolean
 */
function hasUniqueField () {
  var result = false;
  this.forEachField(function (name, field) {
    if (field.isUnique) {
      result = true;
    }
  });
  return result;
}

/**
 * 遍历每一个表字段
 * @callback(field name, field object, context)
 */
function forEachField (callback, fields) {
  var _this = this;
  var targets = fields ? fields : this.fields;
  
  Object.keys(targets).forEach(function (name) {
    var field = _this.fields;
    callback(name, field[name], _this);
  });
}


function precise(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}