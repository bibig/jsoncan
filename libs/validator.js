exports.isNumber = isNumber;
exports.create = create;
exports.isEmpty = isEmpty;
exports.isValidPrimaryId = isValidPrimaryId;

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
  218: 'Duplicated value found, <%s> already exists',
  219: 'Invalid reference'
};

function create (schemas, messages) {
  
  if (messages) {
    Object.keys(messages).forEach(function (key) {
      Messages[key] = messages[key];
    });
  }

  return {
    Map: {},
    Messages: Messages,
    schemas: schemas,
    data: {},
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
    addMessage: addMessage,
    check: check,
    validate: validate,
    checkType: checkType,
    checkSize: checkSize,
    checkUnique: checkUnique,
    checkNull: checkNull,
    checkValue: checkValue,
    checkCustom: checkCustom
  };

}

function check (data, changedFields) {
  var _this = this;
  this.Map = {};
  this.data = data;
  
  /*
  Object.keys(this.fields).forEach(function (name) {
    if (changedFields) { if (changedFields.indexOf(name) == -1) return; }
    _this.validate(name, _this.fields[name], _this.data[name], data);
  });
  */
  
  this.schemas.forEachField(function (name, field, ctx) {
    if (changedFields) { if (changedFields.indexOf(name) == -1) return; }
    _this.validate(name, ctx.fields[name], _this.data[name], data);
  });
  return this;
}

function validate (name, field, value, data) {
  if (this.schemas.isSystemField(field) || this.schemas.isAliasField(field)) return;
  
  this.checkNull.apply(this, arguments);
  if ( !this.isValidField(name) ) return;
  
  // null value is valid, do not need check type, size and value
  if (value !== undefined && value !== '' && value !== null) { 
    this.checkType.apply(this, arguments);
    if ( !this.isValidField(name) ) return;
    
    this.checkSize.apply(this, arguments);
    if ( !this.isValidField(name) ) return;
  
    this.checkValue.apply(this, arguments);
    if ( !this.isValidField(name) ) return;
    
    this.checkUnique.apply(this, arguments);
    if ( !this.isValidField(name) ) return;
  }
  
  this.checkCustom.apply(this, arguments);
}

function isValidField (name) {
  return this.Map[name] === undefined;
}

function checkType (name, field, value) {
  var pass;
  if (!this.schemas.isValidType(field.type)) {
    throw new Error('invalid field type <' + field.type + '>');
  }
  
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
    case 'enum':
    case 'hash':
    case 'map':
      pass = (typeof value == 'string' || typeof value == 'number');
      break;
    case 'ref':
      if (typeof value === 'object') {
        if (isValidPrimaryId(value._id)) { return; }
      } else if (isValidPrimaryId(value)) { return; }
      this.addMessage(name, 219);
      return;
    case 'date':
    case 'datetime':
      if (!validator.isDate(value)) { this.addMessage(name, 208, value); }
      return;
    case 'email':
      if (!validator.isEmail(value)) { this.addMessage(name, 202, value); }
      return;
    case 'url':
      if (!validator.isURL(value)) { this.addMessage(name, 203, value); }
      return;
    case 'alpha':
      if (!validator.isAlpha(value)) { this.addMessage(name, 204, value); }
      return;
    case 'numeric':
      if (!validator.isNumeric(value)) { this.addMessage(name, 205, value);}
      return;
    case 'alphanumeric':
      if (!validator.isAlphanumeric(value)) {  this.addMessage(name, 206, value); }
      return;
    case 'uuid':
      if (!validator.isUUID(value)) { this.addMessage(name, 207, value); }
      return;
    case 'ip':
    case 'ip4':
      if (!validator.isIP(value, 4)) {
        this.addMessage(name, 209, value);  
      }
      return;
    case 'ip6':
      if (!validator.isIP(value, 6)) {
        this.addMessage(name, 210, value);
      }
      return;
    case 'creditCard':
    case 'credit card':
      if (!validator.isCreditCard(value)) {
        this.addMessage(name, 215, value);
      }
      return;
    case 'object':
      pass = typeof value == 'object';
      break;
    default:
      pass = true;
  }
  
  if (!pass) {
    this.addMessage(name, 100, field.type);
  }
  
}

function checkSize (name, field, value) {
  var len = value.length;
  var fixed = field.size || field.length;
  
  if (fixed && len != fixed) {
    this.addMessage(name, 101, fixed);
  }
  
  if (field.max && len > field.max) {
    this.addMessage(name, 102, field.max);
  }
  
  if (field.min && len < field.min) {
    this.addMessage(name, 103, field.min);
  }
}

function checkCustom (name, field, value, data) {
  var message;
  
  if ( typeof field.validate == 'function' ) {
    if ( message = field.validate(value, data)) {
      this.addMessage(name, message);
    }
  }
}

// 注意： unique field不能为空
function checkNull (name, field, value) {
  if ((field.isRequired || field.required || field.isNull === false || field.null === false || field.isUnique )) {
    if (isEmpty(value)) {
      this.addMessage(name, 200);
    }
  }
}

function checkValue (name, field, value) {
  if (field.pattern && !validator.matches(value, field.pattern, 'i')) {
    this.addMessage(name, 201, field.pattern);
    return;
  }
  
  if (field.shouldAfter && !validator.isAfter(value, field.shouldAfter)) {
    this.addMessage(name, 211, field.shouldAfter);
    return;
  }
  
  if (field.shouldBefore && !validator.isBefore(value, field.shouldBefore)) {
    this.addMessage(name, 212, field.shouldBefore);
    return;
  }
  
  if (field.type == 'enum' && field.values.indexOf(value) == -1) {
    this.addMessage(name, 213, field.values.join(','));
    return;
  }
  
  if ((field.type == 'hash' || field.type == 'map') && field.values[value] == undefined) {
    this.addMessage(name, 214, Object.keys(field.values));
    return;
  }
  
  if (field.maxValue && value > field.maxValue) {
    this.addMessage(name, 216, field.maxValue);
    return;
  }

  if (field.minValue && value < field.minValue) {
    this.addMessage(name, 217, field.minValue);
    return;
  }
  
}

function checkUnique (name, field, value) {
  if ( field.isUnique && typeof this.isUnique == 'function') {
    if (!this.isUnique(name, field, value)) {
      this.addMessage(name, 218, value);  
    }
  }
}

function addMessage (name, codeOrMessage/*, param1, param2*/) {
  var message = typeof codeOrMessage == 'number' ? this.Messages[codeOrMessage] : codeOrMessage;
  var params = [message];
  
  for (var i = 2; i < arguments.length; i++) {
    params.push(arguments[i]);
  }
  
  this.Map[name] = util.format.apply(util, params);
}

function isNumber (n) {
  // return n!= null && n!= '' && !isNaN(n);
  return validator.isInt(n) || validator.isFloat(n);
}

function isEmpty () {
  function _isEmpty (s) {
    if (Array.isArray(s)) {
      return s.length === 0;  
    } else {
      return s === undefined || s === null || s === '';
    }
  }
  
  for (var i = 0; i < arguments.length; i++) {
    if (_isEmpty(arguments[i])) { return true; }
  }
  
  return false;
}

function isValidPrimaryId (s) {
  if (typeof s === 'string') {
    return /[0-9a-f]+/.test(s);
  }
  return false;
}