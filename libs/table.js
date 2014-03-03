/**
 * Table
 * support: find, findBy, findAll, insert, insertAll, update, updateBy, updateAll, remove, removeBy, removeAll
 */

exports.create = create;

var fs = require('fs');
var rander = require('rander');
var async = require('async');
var Connect = require('./connect');
var Schemas = require('./schemas');
var Query = require('./query');
var error = require('./error');
var Validator = require('./validator');



/**
 * 创建表对象
 * 1. 创建connection
 * 2. 初始化表需要的目录信息
 * 3. 返回一个封装好的对象
 * @root: 表根目录
 * @table: 表名称
 * @fields: 表字段的定义信息表
 * @return Object
 */
function create (root, table, fields, validateMessages) {
  var conn = Connect.create(root);
  var schemas = Schemas.create(fields);
  var validator = Validator.create(fields, validateMessages);
  
  // 初始化表目录和unique字段目录
  conn.createTablePaths(table, fields);
  
  return {
    table: table,
    conn: conn,
    root: conn.getTablePath(table),
    schemas: schemas,
    fields: schemas.fields,
    validator: validator,
    validate: validate,
    hasUniqueField: hasUniqueField,
    forEachField: forEachField,
    inputFields: function () { return this.schemas.inputFields(); }, // 返回所有来自input输入的字段
    filterEachFieldBeforeSave: filterEachFieldBeforeSave,
    linkEachUniqueField: linkEachUniqueField,
    rawToRead: function (data) { return this.schemas.rawToRead(data);},
    rawsToRead: rawsToRead,
    createQuery: createQuery,
    find: function (id, callback) { this.conn.find(this.table, id, callback); },
    findBy: function (name, value, callback) { this.conn.findBy(this.table, name, value, callback); },
    findSync: function (id) { return this.conn.findSync(this.table, id); },
    findBySync: function (name, value) { return this.conn.findBySync(this.table, name, value); },
    _findAll: function (callback) { this.conn.findAll(this.table, callback);},
    findAll: findAll,
    insert: insert,
    insertAll: insertAll,
    save: save,
    checkUniqueField: checkUniqueField,
    checkEachUniqueField: checkEachUniqueField,
    unlinkEachUniqueField: unlinkEachUniqueField,
    _update: _update,
    updateBy: updateBy,
    update: update,
    updateAll: updateAll,
    _remove: _remove,
    remove: remove,
    removeBy: removeBy,
    removeAll: removeAll,
    model: model,
    create: model, // alias model
    load: load,
    loadBy: loadBy
  };
}

function model (data) {
  var parent = this; // Table
  var _model = {
    isNew: (data._id ? false : true),
    data: data,
    messages: null, // validate messages
    get: function (name) { return this.data[name]; },
    set: function (/*name, value | hash*/) { 
      var _this = this;
      var map;
      
      if (arguments.length == 2) {
        this.data[arguments[0]] = arguments[1]; 
      } else if (arguments.length == 1 && typeof arguments[0] == 'object') {
        map = arguments[0];
        Object.keys(map).forEach(function (name) {
          _this.data[name] = map[name];
        });
      }

      return this;
    },
    validate: function () {
      var data = parent.filterEachFieldBeforeSave(this.data);
      var check = parent.validate(data);
      this.messages = check.getMessages();
      this.isValid = check.isValid();
      return this.isValid;
    },
    getPrimaryId: function () { return this.get('_id'); },
    save: function (callback) {
      var _this = this;
      if (this.isNew) { // update
        parent.insert(this.data, function (e, record) {
          if (e) {
            callback(e);
          } else {
            _this.data = record;
            _this.isNew = false;
            callback(null, record);
          }  
        });        
      } else {
        parent.update(this.getPrimaryId(), this.data, function (e, record) {
          if (e) {
            callback(e);
          } else {
            _this.data = record;
            callback(null, record);
          }  
        });
      }
    },
    remove: function (callback) {
      parent.remove(this.getPrimaryId(), callback);
    }
  };
  
  return _model;
}

function load (_id) {
  return this.model(this.findSync(_id));
}

function loadBy(name, value) {
  return this.model(this.findBySync(name, value));
}

/*
function clone (data) {
  var _data = {};
  
  Object.keys(data).forEach(function (name) {
    _data[name] = data[name];
  });
  
  return _data;
}
*/

/**
 * 本Table是否保护unique字段
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
 * 遍历每一个表记录
 * @callback(field name, field object, context)
 */
function forEachField (callback, fields) {
  var _this = this;
  var targets = fields ? fields : this.fields;
  
  Object.keys(targets).forEach(function (name) {
    callback(name, _this.fields[name], _this);
  });
}

/**
 * 将每条记录的所有hash字段的键值转换成desc
 * @records: 记录列表
 * @return 转换好的列表
 */
function rawsToRead (records) {
  var list = [];
  var _this = this;
  records.forEach(function (record) {
    list.push(_this.rawToRead(record));
  });
  return list;
}

/**
 * 创建查询对象
 * 所有多条查询的前提都是findAll后在过滤出符合条件的数据
 * @callback(err, Query object) 参考Query
 */
function createQuery (callback) {
  this._findAll(function (err, records) {
    if (err) {
      callback(err);
    } else {
      callback(null, Query.create(records));
    }
  });
}

/**
 * 插入一条记录
 * 步骤：
 * 1. 对每个字段数据进行过滤
 * 2. 增加_id值
 * 3. 检查unique字段的合法性
 * @data: 记录数据
 * @callback(err, record)
 */
function insert (data, callback) {
  
  var _this = this;
  // 补充default值, _id值
  data = this.filterEachFieldBeforeSave(data);

  // this.checkEachUniqueField(data); // process moved into validator
  // console.log(data);
  this.save(data, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _this.linkEachUniqueField(record);
      callback(null, record);
    }
  });

}

function insertAll (records, callback) {
  var _this = this;

  async.map(records, function (record, asyncCallback) {
    _this.insert(record, function (err, record) {
      asyncCallback(err, record);
    });
  }, callback);
}

// 生成_id值
function getPrimaryId () {
  return require('crypto').randomBytes(20).toString('hex');
}

// 得到当前时戳
function getTimestamp () {
  return (new Date()).getTime();
}

/**
 * 检查每一个unique字段的唯一性和非空
 * @record: 要保存的数据
 * @fields: 特别指定的字段，update的时候可能只需要检查更改过的字段
 */
function checkEachUniqueField (record, fields) {
  this.forEachField(function (name, field, ctx) {
    if (field.isUnique) {
      ctx.checkUniqueField(name, record[name]);
    }
  }, fields);
}

/**
 * 检查unique字段值的唯一性
 * @name: 字段名
 * @value: 值
 * @throw: 1100, 1101
 */
function checkUniqueField (name, value, isReturn) {
  /*
  if (value == undefined || value == null || value == '') {
    if (isReturn) {
      return false;
    } else {
      throw error.create(1100, name);
    }
  }
  */
  var linkFile = this.conn.getTableUniqueFile(this.table, name, value);
  if (isReturn) {
    return !fs.existsSync(linkFile);
  } else if (fs.existsSync(linkFile)) {
    throw error.create(1101, value, name);
  }
}


/**
 * 为每一个unique字段创建一个symbol link文件，指向以本record的id文件
 * 前提：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @fields: 特别指定的字段范围
 */
function linkEachUniqueField (record, fields) {
  var idFile = this.conn.getTableIdFile(this.table, record._id);

  this.forEachField(function (name, field, ctx) {
    var linkFile;
    if (field.isUnique) {
      
      linkFile = ctx.conn.getTableUniqueFile(ctx.table, name, record[name]);
      // console.log('ready to link %s to %s', linkFile, idFile);
      fs.symlinkSync(idFile, linkFile);
    }
  }, fields);
}


/**
 * 删除每一个unique字段的symbol link文件
 * 调用此方法的前提是：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @fields: 特别指定的字段范围
 */
function unlinkEachUniqueField (record, fields) {
  // console.log(record);
  this.forEachField(function (name, field, ctx) {
    var linkFile;
    if (field.isUnique) {
      linkFile = ctx.conn.getTableUniqueFile(ctx.table, name, record[name]);
      // console.log('ready to unlink %s', linkFile);
      fs.unlinkSync(linkFile);
    }
  }, fields);
}

/**
 * 过滤data中的信息，只保留有定义的字段信息
 * 如果字段是required类型，且设置了默认值，将自动填充
 * 本方法在保存到文件前调用
 * @data: 要过滤的数据
 */
function filterEachFieldBeforeSave (data) {
  var _this = this;
  var filtered = {};
  
  this.forEachField(function (name, field) {
    if ( data[name] !== undefined) { // data中已经设置, 注意可以为空值，null值
      
      if (field.isCurrent) { // 始终要求为当前时间， eg: updated or modified
        data[name] = getTimestamp();
      }
      
      if ( (field.type == 'date' || field.type == 'datetime') && data[name].length > 0 ) { // string to date object
        data[name] = new Date(data[name]);
      }
      
      filtered[name] = data[name];
      
    } else if (field.isPrimary) {  // _id
      filtered[name] = getPrimaryId();
    } else if (field.isRandom) {
      filtered[name] = getRandom(field.type, field.length);
    } else if (field.isTimestamp || field.isCurrent) {  // 是否是邮戳， 如果没有赋值，将赋当前时间戳值
      filtered[name] = getTimestamp();
    } else if (field.default !== undefined) { // schemas中有定义默认值
      if (typeof field.default == 'function') {
        filtered[name] = field.default();
      } else {
        filtered[name] = field.default;
      }
    } else {
      filtered[name] = null;
    }
  });
  
  return filtered;
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

/** 
 * 先根据data._id查出整个记录，然后合并数据，最后再保存数据
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @data: 要保存的数据
 * @callback(err, record)
 */ 
function update (_id, data, callback) {
  var _this = this;
  
  this.find(_id, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _this._update(data, record, callback);
    }
  });
}

function updateBy (field, value, data, callback) {
  var _this = this;
  this.findBy(field, value, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _this._update(data, record, callback);
    }
  });
}


/** 
 * 先合并数据，最后再保存数据
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @data: 要保存的数据
 * @record: 当前数据库中的数据
 * @callback(err, record)
 */ 
function _update (data, record, callback) {
  var _this = this;
  var safe = {}; // 避免data中夹杂schemas没有定义的数据
  /*
  // var changedFields = {}; // 记录改动了的字段的现值
  // var changedFieldsSource = {};  // 记录了改动了的字段的原值
  */
  
  if (!record) { // no data found in db
    callback(null, null);
    return;
  }
  
  this.forEachField(function (name, field) {
    if (data[name] == undefined) {
      safe[name] = record[name];
    } else {
      /*
      // 如果data设了值，检查是否与原记录相同
      if (data[name] !== record[name]) {
        changedFields[name] = data[name];
        changedFieldsSource[name] = record[name];
      }
      */
      safe[name] = data[name];
    }
  });
  
  this.unlinkEachUniqueField(record);
  // 补充default值
  safe = this.filterEachFieldBeforeSave(safe);
  // console.log(safe);
  this.save(safe, function (err, updatedRecord) {
    if (err) {
      // 出错时，要还原link文件
      _this.linkEachUniqueField(record);
      callback(err);
    } else {
      _this.linkEachUniqueField(updatedRecord);
      callback(null, updatedRecord);
      /*
      // 如果unique字段改动了，需要校验其唯一性和值非空
      if (Object.keys(changedFields).length > 0) {
        // this.checkEachUniqueField(safe, changedFields);
        _this.linkEachUniqueField(safe, changedFields);
        _this.unlinkEachUniqueField(changedFieldsSource, changedFieldsSource);
      }
      */
    }
  });
}


function updateAll (options, data, callback) {
  var _this = this;
  this.createQuery(function (err, query) {
    var records;
    if (err) {
      callback(err);
    } else {
      records = query.filter(options).select();
      if (records.length > 0) { // no data found after filter,
        async.each(records, function (record, asyncCallback) {
          _this._update(data, record, function (err) {
            asyncCallback(err);
          });
        }, callback);
      } else {
        callback(null);
      }
    }
    
  });
}

/** 
 * 物理删除一条记录
 * 如果有unique字段，需要挨个清除掉unique字段的link文件
 * @_id: primary id
 * @callback(err)
 */
function remove (_id, callback) { 
  var _this = this;
  
  if (this.hasUniqueField()) {
    this.find(_id, function (err, record) {
      if (err) {
        callback(err);
      } else {
        _this._remove(record, callback);
      }
    });
  } else {
    this.conn.remove(this.table, _id, callback);
  }
}

function _remove (record, callback) {
  // no data found
  if (!record) {
    callback();
  } else {
    if (this.hasUniqueField()) {
      this.unlinkEachUniqueField(record);
    }
    this.conn.remove(this.table, record._id, callback);
  }
}

function removeBy (field, value, callback) {
  this.findBy(field, value, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _this._remove(record, callback);
    }
  });
};

function removeAll (options, callback) {
  var _this = this;
  this.createQuery(function (err, query) {
    var records;
    
    if (err) {
      callback(err);
    } else {
      records = query.filter(options).select();
      if (records.length > 0) {
        async.each(records, _this._remove.bind(_this), function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    }
  });
  
}

function findAll (/*options, callback*/) {
  var options, callback;
  var _this = this;
  // console.log(arguments);
  
  switch (arguments.length) {
    case 1:
      callback = arguments[0];
      _this._findAll(callback);
      return;
    case 2:
      options = arguments[0];
      callback = arguments[1];
      fields = null;
      break;
    case 3:
    default:
      options = arguments[0];
      fields = arguments[1];
      callback = arguments[2];
      break;
  }
  
  this.createQuery(function (err, query) {
    var records;
    if (err) {
      callback(err);
    } else {
      records = query.filter(options).select(fields);
      callback(null, records);
    }
  });
  
}

function validate (data) {
  var _this = this;

  this.validator.isUnique = function (name, field, value) {
    return _this.checkUniqueField (name, value, true);
  };
  
  return this.validator.check(data);
}

/**
 * 保存数据
 * @data: 要保存的数据
 * @callback(err, data or invalid messages)
 *  error 1300 表示数据校验失败
 */
function save (data, callback) {
  
  var e;
  var check = this.validate(data);
  
  if (check.isValid()) {
    this.conn.save(this.table, data._id, data, callback); 
  } else {
    e = error.create(1300); 
    e.invalidMessages = check.getMessages();
    e.invalid = true;
    callback(e);
  }
}