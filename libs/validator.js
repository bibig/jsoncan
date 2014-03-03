exports.create = create;

var validator = require('validator');
var util = require('util');
var error = require('./error');

var Messages = {
  100: 'Invalid type, should be <%s>',
  101: 'Invalid size, value size must be <%d>',
  102: 'Invalid size, value size should be less than <%d>',
  103: 'Invalid size, value size should be greater than <%d>',
  200: 'It is required, value should not be null',
  201: 'Invalid value, it cannot match the pattern <%s>',
  202: 'Invalid email <%s>',
  203: 'Invalid url <%s>',
  204: 'Invalid alpha value <%s>',
  205: 'Invalid numeric value <%s>',
  206: 'Invalid alpha numeric value <%s>',
  207: 'Invalid UUID <%s>',
  208: 'Invalid date string <%s>',
  209: 'Invalid IP4 <%s>',
  210: 'Invalid IP6 <%s>',
  211: 'Invalid date, it should be after <%s>',
  212: 'Invalid date, it should be before <%s>',
  213: 'Invalid enum value, it should be in <%s>',
  214: 'Invalid map value, it should be in <%s>',
  215: 'Invalid credit card <%s>',
  216: 'Invalid value, it should be less than <%s>',
  217: 'Invalid value, it should be greater than <%s>',
  218: 'Duplicated value found, <%s> already exists'
};

function create (fields, data, messages) {
  
  if (messages) {
    Object.keys(messages).forEach(function (key) {
      Messages[key] = messages[key];
    });
  }

  return {
    Map: {},
    Messages: Messages,
    fields: fields,
    data: data,
    isValid: function () {
      return this.getCount() == 0;
    },
    isValidField: isValidField,
    getMessages: function () {
      // console.log(Map);
      return this.Map;
    },
    getCount: function () {
      return Object.keys(this.Map).length;
    },
    isUnique: null,  // 需要外部注入
    setMessage: setMessage,
    run: run,
    validate: validate,
    checkType: checkType,
    checkSize: checkSize,
    checkUnique: checkUnique,
    checkNull: checkNull,
    checkValue: checkValue,
  };

}

function run () {
  var _this = this;
  Object.keys(this.fields).forEach(function (name) {
    _this.validate(name, _this.fields[name], _this.data[name]);
  });
  return this;
}

function validate (name, field, value) {
  
  this.checkNull.apply(this, arguments);
  if ( !this.isValidField(name) ) return;
  
  this.checkType.apply(this, arguments);
  if ( !this.isValidField(name) ) return;
  
  this.checkSize.apply(this, arguments);
  if ( !this.isValidField(name) ) return;

  this.checkValue.apply(this, arguments);
  if ( !this.isValidField(name) ) return;
  
  this.checkUnique.apply(this, arguments);
}

function isValidField (name) {
  return this.Map[name] === undefined;
}

function checkType (name, field, value) {
  var pass;
  switch (field.type) {
    case 'int':
    case 'timestamp':
      pass = validator.isInt(value);
      break;
    case 'float':
      pass = validator.isFloat(value);
      break;
    case 'text':
    case 'string':
      pass = typeof value == 'string';
      break;
    case 'boolean':
    case 'bool':
      pass = typeof value == 'boolean';
      break;
    case 'date':
    case 'datetime':
      pass =  validator.isDate(value);
      break;
    case 'enum':
    case 'hash':
    case 'map':
      pass = (typeof value == 'string' || typeof value == 'number');
      break;
    case 'object':
      pass = typeof value == 'object';
      break;
    default:
      throw new Error('invalid field type <' + field.type + '>');
  }
  
  if (!pass) {
    this.setMessage(name, 100, field.type);
  }
  
}

function checkSize (name, field, value) {
  var len = value.length;
  var fixed = field.size || field.length;
  
  if (fixed && len != fixed) {
    this.setMessage(name, 101, fixed);
  }
  
  if (field.max && len > field.max) {
    this.setMessage(name, 102, field.max);
  }
  
  if (field.min && len < field.min) {
    this.setMessage(name, 103, field.min);
  }
}

// 注意： unique field不能为空
function checkNull (name, field, value) {
  if ( (field.isRequired || field.required || field.isNull === false || field.isUnique ) &&  validator.isNull(value) ) {
    this.setMessage(name, 200);
  }
}

function checkValue (name, field, value) {
  
  if (field.pattern && !validator.matches(value, field.pattern, 'i')) {
    this.setMessage(name, 201, field.pattern);
    return;
  }
  
  if (field.isEmail && !validator.isEmail(value)) {
    this.setMessage(name, 202, value);
    return;
  }
  
  if (field.isUrl && !validator.isURL(value)) {
    this.setMessage(name, 203, value);
    return;
  }
  
  if (field.isAlpha && !validator.isAlpha(value)) {
    this.setMessage(name, 204, value);
    return;
  }

  if (field.isNumeric && !validator.isNumeric(value)) {
    this.setMessage(name, 205, value);
    return;
  } 
  
  if (field.isAlphanumeric && !validator.isAlphanumeric(value)) {
    this.setMessage(name, 206, value);
    return;
  }

  if (field.isUUID &&  !validator.isUUID(value)) {
    this.setMessage(name, 207, value);
    return;
  }
  
  if (field.isDate && !validator.isDate(value)) {
    this.setMessage(name, 208, value);
    return;
  }
  
  if ((field.isIP || field.isIP4) && !validator.isIP(value, 4)) {
    this.setMessage(name, 209, value);
    return;
  }
  
  if (field.isIP6 && !validator.isIP(value, 6)) {
    this.setMessage(name, 210, value);
    return;
  }
  
  if (field.shouldAfter && !validator.isAfter(value, field.shouldAfter)) {
    this.setMessage(name, 211, field.shouldAfter);
    return;
  }
  
  if (field.shouldBefore && !validator.isBefore(value, field.shouldBefore)) {
    this.setMessage(name, 212, field.shouldBefore);
    return;
  }
  
  if (field.type == 'enum' && field.values.indexOf(value) == -1) {
    this.setMessage(name, 213, field.values.join(','));
    return;
  }
  
  if ((field.type == 'hash' || field.type == 'map') && field.values[value] == undefined) {
    this.setMessage(name, 214, Object.keys(field.values));
    return;
  }
  
  if (field.isCreditCard &&  !validator.isCreditCard(value)) {
    this.setMessage(name, 215, value);
    return;
  }
  
  if (field.maxValue && value > field.maxValue) {
    this.setMessage(name, 216, field.maxValue);
    return;
  }

  if (field.minValue && value < field.minValue) {
    this.setMessage(name, 217, field.minValue);
    return;
  }
  
}

function checkUnique (name, field, value) {
  if ( field.isUnique && typeof this.isUnique == 'function') {
    if (!this.isUnique(name, field, value)) {
      this.setMessage(name, 218, value);  
    }
  }
}

function setMessage (name, code/*, param1, param2*/) {
  var params = [this.Messages[code]];
  
  for (var i = 2; i < arguments.length; i++) {
    params.push(arguments[i]);
  }
  
  // console.log('ready to add <%s> message <%s>', name, util.format.apply(util, params));
  
  this.Map[name] = util.format.apply(util, params);
}
