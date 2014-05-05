/**
 * Expose `createError()`
 */
exports = module.exports = createError;

var util = require('util');
var Messages = {
  //schemas
  // 1000: 'Invalid schema element <%s> found in field <%s>.',
  1001: 'Missing basic schema element <%s> in field <%s>.',
  1002: 'Invalid field\'s type <%s> found in field <%s>.',
  1003: 'Invalid field <%s>',
  1004: '<%s> is not an unique field, cannot use findBy feature.',
  1005: 'Invalid table <%s>',
  1006: 'Invalid reference field <%s>',
  
  // table
  1100: 'Unique field <%s> should have a value.',
  1101: 'Duplicated value found <%s> in unique field <%s>.',
  
  // query
  1200: 'Invalid operator <%s> in query.',
  1201: 'Invalid regex object : <%s>.',
  1202: 'Invalid query value <%s> in <like> query, only support:[%key, key%, %key%].',
  
  // save data
  1300: 'invalid data found, save failed!',
  1400: 'no data found, find by <%s=%s>'
};


    
function createError (code/*,var1, var2*/) {
  var error, message, params = [];
  
  if (!code) {
    throw new Error('Missing error code !');
  }
  
  if (!Messages[code]) {
    throw new Error('Invalid error code <' + code + '>');
  }
  
  params.push(Messages[code]);
  
  for (var i = 1; i < arguments.length; i++) {
    params.push(arguments[i]);
  }
  
  message = util.format.apply(util, params);
  
  error = new Error(message);
  error.code = code;
  
  return error;
}