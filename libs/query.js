/**
 * query是对findAll获取的数据进行再加工处理
 * query = Table.createQuery();
 * query.order('created').limit(100).select('id', 'name');
 * query.where('name', '张三').select();
 * query.where('age', '>', 10).select(['id', 'name', 'age']);
 *
 */


exports.create = create;

var util = require('util');
var error = require('./error');


/**
 * 创建查询对象
 * @records: 原始数据，array
 * @return Object
 */
function create (records) {
  return {
    records: records,
    isEmpty: isEmpty,
    select: select,
    skip: skip,
    limit: limit,
    where: where,
    order: order,
    count: count,
    sum: sum,
    average: average,
    filter: filter
  };
}

// 是否有记录存在
function isEmpty () {
  return this.records.length > 0;
}

/**
 * 选择字段
 * @_fields: 特别指定的字段，为空表示全选
 * @return array
 * examples:
 *  1. select()
 *  2. select('id, name, age')
 *  3. select(id, name, age)
 *  4. selelct(['id', 'name', 'age'])
 */
function select (/*fields*/) {
  var fields = [];
  if (arguments.length > 1) {
    for (var i = 0; i < arguments.length; i++) {
      fields.push(arguments[i]);
    }
  } else if (arguments.length == 1) {
    fields = arguments[0];
  } else {
    return this.records;
  }

  if (typeof fields == 'string') {
    fields = fields.replace(/[\s]/g, '');
    if (fields.indexOf(',') > -1) { // 支持select('id, name, age');
      fields = fields.split(',');
    } else {
      fields = [fields];
    }
  }
  
  if (util.isArray(fields)) {
    return _select(this.records, fields);
  } else {
    return this.records;
  }
  
  function _select (records, fields) {
    var list = [];
    records.forEach(function (record) {
      var newRecord = {};
      fields.forEach(function (field) {
        newRecord[field] = record[field];
      });
      list.push(newRecord);
    });
    return list;
  }
  
  return this.records;
}

/**
 * 求和
 * @field: 字段名
 * @return this
 */
function sum (field) {
  var _sum = 0;
  this.records.forEach(function (record) {
      _sum += record[field] || 0;
  });
  
  return _sum;
}

/**
 * 返回记录数
 */
function count () {
  return this.records.length;
}

/**
 * 求平均数
 * @field: 字段名
 * @return this
 */
function average (field) {
  var _sum = this.sum(field)
  return _sum / this.records.length;
}


/**
 * 限制输出列表数
 * @n: 个数
 * @return this
 */
function limit (n) {
  var list = [];
  var max = this.records.length;
  
  if (n > max) {
    n = max;
  }
  
  for (var i = 0; i < n; i++) {
    list.push(this.records[i]);
  }
  
  this.records = list;
  
  return this;
}

/**
 * 跳跃指定数目的记录
 * @n: 个数，从1开始
 * @return this
 */

function skip (n) {
  var list = [];
  var max = this.records.length;
  
  if (n < max) {
    for (var i = n; i < max; i++) {
      list.push(this.records[i]);
    }
  } 
  
  this.records = list;
  return this;
}

/**
 * 排序
 * @field: 字段名
 * @isDescend: 是否倒序
 * @return this
 */
function order (field, isDescend) {
  this.records.sort(function (a, b) {
    return isDescend ? ( a[field] < b[field] ) : ( a[field] > b[field] );
  });
  
  return this;
}

/**
 * 比较值是否符合要求
 *
 * examples:
 *    where('id', 1000)
 *    where('age', '>', 10])
 *    where('name', 'in', ['Tom', 'Peter', 'Kim'])
 *    where('name', 'not in' ['David', 'Rose', 'Cici'])
 *    where('age', 'between', [3, 6])
 *    where('name', 'like', '%vid');
 *
 * @field: 要进行比较的字段名
 * @return records 符合要求的记录列表
 */
function where (field/*, operator, value|values*/) {
  var operator, value;
  var list = [];
  
  if (arguments.length == 2) {
    operator = '=';
    value = arguments[1];
  } else if (arguments.length == 3) {
    operator = arguments[1];
    if (util.isArray(arguments[2])) {
      value = arguments[2];
    } else {
      value = arguments[2];
    }
  } else {
    return this;
  }
  
  this.records.forEach(function (record) {
    if (compare(record[field], operator, value)) {
      list.push(record);
    }
  });
  
  this.records = list;
  return this;
}

function filter (options) {
  var _this = this;
  var keys = Object.keys(options);
  
  keys.forEach(function (key) {
    var params = [key];
    if (util.isArray(options[key])) {
      options[key].forEach(function (param) {
        params.push(param);
      });
    } else {
      params.push(options[key]);
    }
    _this = _this.where.apply(_this, params);
  });
  return _this;  
}

/**
 * 比较值是否符合要求
 * @fieldValue: 字段值
 * @operator: 比较运算符
 * @value： 比较值
 * @return boolean
 */
function compare (fieldValue, operator, value) {
  switch(operator.toLowerCase()) {
    case '=':
      return fieldValue == value;
    case '>=':
      return fieldValue >= value;
    case '>':
      return fieldValue > value;
    case '<':
      return fieldValue < value;
    case '<=':
      return fieldValue <= value;
    case '<>':
    case '!=':
      return fieldValue != value;
    case 'in':
      for (var i = 0; i < value.length; i++) {
        if (fieldValue == value[i]) {
          return true;
        }
      }
      return false;
    case 'not in':
      for (var i = 0; i < value.length; i++) {
        if (fieldValue == value[i]) {
          return false;
        }
      }
      return true;
    case 'between':
      return fieldValue > value[0] && fieldValue < value[1];
    case 're':
    case 'regex':
      if (util.isRegExp(value)) {
        return value.test(fieldValue);  
      } else {
        throw error.create(1201, value);
      }
      
    case 'like': // 必须包含%
      var pattern1 = /^%[^%]+$/i;  // %开头
      var pattern2 = /^[^%]+%$/i;  // %结尾
      var pattern3 = /^%[^%]+%$/i; // %包围
      var key = value.replace(/%/g, '');
      var index = fieldValue.indexOf(key);
      
      if (pattern1.test(value)) {
        return index + key.length == fieldValue.length;
      }
      
      if (pattern2.test(value)) {
        return index == 0;
      }
      
      if (pattern3.test(value)) {
        return index > -1;
      }
      
      throw error.create(1202, value);
    default:
      throw error.create(1200, operator);
  }
}