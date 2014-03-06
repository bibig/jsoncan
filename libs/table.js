/**
 * Table
 * support: find, findBy, findAll, insert, insertAll, update, updateBy, updateAll, remove, removeBy, removeAll
 */

exports.create = create;

var fs = require('fs');
var rander = require('rander');
var async = require('async');
// var Connect = require('./connect');
var Schemas = require('./schemas');
var Query = require('./query');
var error = require('./error');
var Validator = require('./validator');
var safepass = require('safepass');


/**
 * create table object
 *  
 * @conn: connection
 * @table: table name
 * @fields: schemas
 * @return Object
 */
function create (conn, table, fields, validateMessages) {
  var schemas = Schemas.create(fields);
  var validator = Validator.create(schemas, validateMessages);
  
  // build table root path and unique fields paths
  conn.createTablePaths(table, fields);
  
  return {
    table: table,
    conn: conn,
    schemas: schemas,
    validator: validator,
    validate: validate,
    clearFakeFields: clearFakeFields,
    inputFields: function () { return this.schemas.inputFields(); }, // 返回所有来自input输入的字段
    getChangedFields: getChangedFields,
    getUpdateSafeData: getUpdateSafeData,
    linkEachUniqueField: linkEachUniqueField,
    readField: function (name, value, data) { return this.schemas.read(name, value, data); },
    rawToRead: function (data) { return this.schemas.rawToRead(data);},
    rawsToRead: rawsToRead,
    createQuery: createQuery,
    createQuerySync: createQuerySync,
    read: read,
    readSync: readSync,
    readBy: readBy,
    readBySync: readBySync,
    readAll: readAll,
    readAllSync: readAllSync,
    find: find,
    findBy: findBy,
    findSync: findSync,
    findBySync: findBySync,
    _findAll: function (callback) { this.conn.findAll(this.table, callback);},
    _findAllSync: function () { return this.conn.findAllSync(this.table);},
    findAll: findAll,
    findAllSync: findAllSync,
    insert: insert,
    insertSync: insertSync,
    insertAll: insertAll,
    insertAllSync: insertAllSync,
    save: save,
    saveSync: saveSync,
    checkUniqueField: checkUniqueField,
    checkEachUniqueField: checkEachUniqueField,
    unlinkEachUniqueField: unlinkEachUniqueField,
    _update: _update,
    _updateSync: _updateSync,
    updateBy: updateBy,
    updateBySync: updateBySync,
    update: update,
    updateSync: updateSync,
    updateAll: updateAll,
    updateAllSync: updateAllSync,
    _remove: _remove,
    _removeSync: _removeSync,
    remove: remove,
    removeSync: removeSync,
    removeBy: removeBy,
    removeBySync: removeBySync,
    removeAll: removeAll,
    removeAllSync: removeAllSync,
    model: model,
    create: model, // alias model
    load: load,
    loadBy: loadBy,
    // isValidPassword: isValidPassword // deprecated
  };
}

function model (data) {
  var parent = this; // Table
  var _model = {
    isNew: (data._id ? false : true),
    data: data,
    messages: null, // validate messages
    get: function (name) { return this.data[name]; },
    read: function (name) {
      if (name) {
        return parent.readField(name, this.data[name], this.data);
      } else {
        return parent.rawToRead(this.data);
      }
    },
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
      var check = parent.validate(this.data);
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
    saveSync: function () {
      var _this = this;
      if (this.isNew) { // update
        this.data = parent.insertSync(this.data);        
        this.isNew = false;
      } else {
        this.data = parent.updateSync(this.getPrimaryId(), this.data);
        // console.log(this.data);
      }
      return this;
    },
    remove: function (callback) {
      parent.remove(this.getPrimaryId(), callback);
    },
    removeSync: function () {
      parent.removeSync(this.getPrimaryId());
    },
    isValidPassword: function (pass, passwordFieldName) {
      passwordFieldName = passwordFieldName || 'password';
      if (parent.schemas.isType(passwordFieldName, 'password')) { // check whether the field is password
        return parent.schemas.isValidPassword(this.data[passwordFieldName], pass);
      } else {
        return false;
      }
    }
  };
  
  return _model;
}

function load (_id) {
  var data = this.findSync(_id);
  if (!data) { return null; }
  return this.model(data);
}

function loadBy(name, value) {
  var data = this.findBySync(name, value);
  if (!data) { return null; }
  return this.model(data);
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
 * remove all the fake fields data
 * @data, ready to save
 */

function clearFakeFields (data) {
  var noFake = {};
  this.schemas.forEachField(function (name, field, _this) {
    noFake[name] = data[name];
  }, data, function (field) {
    return !field.isFake;
  });
  
  return noFake;
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

function createQuerySync () {
  return Query.create(this._findAllSync());
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
  
  // 转换数据
  // data = this.transformateEachField(data);

  // 补充default值, _id值
  data = this.schemas.addValues(data);

  // this.checkEachUniqueField(data); // process moved into validator
  this.save(data, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _this.linkEachUniqueField(record);
      callback(null, record);
    }
  });
}

/**
 * sync way of insert
 */
function insertSync (data) {
  // 转换数据
  // data = this.transformateEachField(data);

  // 补充default值, _id值
  data = this.schemas.addValues(data);

  // 保存后的数据
  data = this.saveSync(data);
  
  // link files
  this.linkEachUniqueField(data);
  
  return data;
}

function insertAll (records, callback) {
  var _this = this;

  async.map(records, function (record, asyncCallback) {
    _this.insert(record, function (err, record) {
      asyncCallback(err, record);
    });
  }, callback);
}

function insertAllSync (records) {
  var _this = this;
  var results = [];
  
  records.forEach(function (record) {
    results.push(_this.insertSync(record));
  });
  
  return results;
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
  var _this = this;
  this.schemas.forEachField(function (name, field) {
    if (field.isUnique) {
      _this.checkUniqueField(name, record[name]);
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
  var _this = this;

  this.schemas.forEachField(function (name, field) {
    _this.conn.linkTableUniqueFileSync(_this.table, record._id, name, record[name]);
  }, fields, function (field) {
    return field.isUnique === true;
  });
}


/**
 * 删除每一个unique字段的symbol link文件
 * 调用此方法的前提是：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @fields: 特别指定的字段范围
 */
function unlinkEachUniqueField (record, fields) {
  var _this = this;
  this.schemas.forEachField(function (name, field) {
    _this.conn.unlinkTableUniqueFileSync(_this.table, name, record[name]);
  }, fields, function (field) {
    return field.isUnique === true;
  });
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
      // console.log('@update');
      // console.log('be to save');
      // console.log(data);
      // console.log('record in db');
      // console.log(record);
      _this._update(data, record, callback);
    }
  });
}

/** 
 * update sync version
 */ 
function updateSync (_id, data) {
  var _this = this;
  var record = this.findSync(_id);
  return this._updateSync(data, record);
}

function updateBy (field, value, data, callback) {
  var _this = this;
  this.findBy(field, value, function (err, record) {
    if (err) {
      callback(err);
    } else if (!record) {
      callback(error.create(1400, field, value));
    } else {
      _this._update(data, record, callback);
    }
  });
}


/** 
 * updateBy sync version
 */ 
function updateBySync (field, value, data) {
  var record = this.findBySync(field, value);
  if (!record) {
    throw error.create(1400, field, value);
  }
  return this._updateSync(data, record);
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
  var changedFields = this.getChangedFields(data, record);
  var safe;
  
  // console.log('@_unpdate');
  // console.log('ready to save data:');
  // console.log(data);
  // console.log('record in db:');
  // console.log(record);
  // console.log('changedFields:' + changedFields);
  
  if (changedFields.length == 0 ) { // 数据没有更改,
    return callback(null, record);
  }
  
  safe = this.getUpdateSafeData(data, record, changedFields);
  
  
  // console.log('safe data');
  // console.log(safe);
  // 保存之前，删除掉link files
  this.unlinkEachUniqueField(record, changedFields);
  
  this.save(safe, function (err, updatedRecord) {
    if (err) {
      // 出错时，要还原link文件
      _this.linkEachUniqueField(record, changedFields);
      callback(err);
    } else {
      // console.log('after save:');
      // console.log(updatedRecord);
      
      _this.linkEachUniqueField(updatedRecord, changedFields);
      callback(null, updatedRecord);
    }
  }, changedFields);
}

/** 
 * _update sync version
 */ 
function _updateSync (data, record, callback) {
  var changedFields = this.getChangedFields(data, record);
  var safe;
  
  if (changedFields.length == 0 ) { // 数据没有更改,
    return record;
  }
  
  try{
    this.unlinkEachUniqueField(record, changedFields);
    safe = this.saveSync(this.getUpdateSafeData(data, record, changedFields), changedFields);
    this.linkEachUniqueField(safe, changedFields);
    return safe;
  } catch (e) {
    this.linkEachUniqueField(record, changedFields);
    throw e;
  }
}

function getChangedFields (data, record) {
  var fields = [];
  this.schemas.forEachField(function (name, field) {
    if (data[name] != record[name]) {
      fields.push(name);
    }
  }, data);
  return fields;
}

/** 
 * 无论是sync or async都要处理的部分
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @data: 要保存的数据
 * @record: 当前数据库中的数据
 */ 
function getUpdateSafeData (data, record, changedFields) {
  var safe = {}; // 避免data中夹杂schemas没有定义的数据
  // console.log(changedFields);
  this.schemas.forEachField(function (name, field) {
    if (data[name] == undefined) {
      safe[name] = record[name];
    } else {
      safe[name] = data[name];
    }
  });
  
  return this.schemas.addValues(safe, changedFields);
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

function updateAllSync (options, data) {
  var _this = this;
  var records = this.createQuerySync().filter(options).select();
  records.forEach(function (record) {
    _this._updateSync(data, record);
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
  
  if (this.schemas.hasUniqueField()) {
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

function removeSync (_id) {
  if (this.schemas.hasUniqueField()) {
    this._removeSync(this.findSync(_id));
  } else {
    this.conn.removeSync(this.table, _id);
  }
}

function _remove (record, callback) {
  // no data found
  if (!record) {
    callback();
  } else {
    if (this.schemas.hasUniqueField()) {
      this.unlinkEachUniqueField(record);
    }
    this.conn.remove(this.table, record._id, callback);
  }
}

function _removeSync (record) {
  if (!record) return;
  if (this.schemas.hasUniqueField()) {
    this.unlinkEachUniqueField(record);
  }
  this.conn.removeSync(this.table, record._id);
}

function removeBy (field, value, callback) {
  var _this = this;
  
  this.findBy(field, value, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _this._remove(record, callback);
    }
  });
};

function removeBySync (field, value, callback) {
  this.removeSync(this.findBySync(field, value));
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


function removeAllSync (options, callback) {
  var _this = this;
  var records = this.createQuerySync().filter(options).select();
  records.forEach(function (record) {
    _this._removeSync(record);
  });
}

function find (_id, callback) { 
  if (Validator.isEmpty(_id)) { return null; }
  this.conn.find(this.table, _id, callback);
}

function findBy (name, value, callback) {
  if (Validator.isEmpty(name, value)) { return null; }
  this.conn.findBy(this.table, name, value, callback); 
}

function findSync (_id) { 
  if (Validator.isEmpty(_id)) { return null; }
  return this.conn.findSync(this.table, _id); 
}

function findBySync (name, value) { 
  if (Validator.isEmpty(name, value)) { return null; }
  return this.conn.findBySync(this.table, name, value); 
}

function findAll (/*options, select, callback*/) {
  var _this = this;
  var options;
  var fields;
  var callback;
  
  switch (arguments.length) {
    case 1: // no options
      callback = arguments[0];
      break;
    case 2: // hash options
      if (Array.isArray(arguments[0]) || typeof arguments[0] == 'string') {
        fields = arguments[0];
      } else if (typeof arguments[0] == 'object') {
        options = arguments[0];  
      }
      callback = arguments[1];
      break;
    case 3:
    default:
      options = arguments[0];
      fields = arguments[1];
      callback = arguments[2];
      break;
  }
  
  if (!options && !fields) {
    return this._findAll(callback);
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

function findAllSync (options, fields) {
  var _this = this;
  
  if (!options) {
    return this._findAllSync();
  }
  
  return this.createQuerySync().filter(options).select(fields);
}

function validate (data, changedFields) {
  var _this = this;

  this.validator.isUnique = function (name, field, value) {
    return _this.checkUniqueField (name, value, true);
  };
  
  return this.validator.check(data, changedFields);
}

/**
 * 保存数据
 * @data: 要保存的数据
 * @callback(err, data or invalid messages)
 *  error 1300 表示数据校验失败
 */
function save (data, callback, changedFields) {
  
  var e;
  var check = this.validate(data, changedFields);
  
  if (check.isValid()) {
    data = this.clearFakeFields(data);
    // 对需要转换的数据进行转换
    data = this.schemas.convertEachField(data, changedFields);
    this.conn.save(this.table, data._id, data, callback); 
  } else {
    e = error.create(1300); 
    e.invalidMessages = check.getMessages();
    e.invalid = true;
    callback(e);
  }
}

/**
 * 同步保存数据
 * @data: 要保存的数据
 * @throw error 1300 表示数据校验失败
 */
function saveSync (data, changedFields) {
  // console.log(changedFields);
  var check = this.validate(data, changedFields);
  
  if (check.isValid()) {
    data = this.clearFakeFields(data);
    data = this.schemas.convertEachField(data, changedFields);
    // console.log('@saveSync, after check');
    // console.log(changedFields);
    // console.log(data);
    return this.conn.saveSync(this.table, data._id, data); 
  } else {
    e = error.create(1300); 
    e.invalidMessages = check.getMessages();
    e.invalid = true;
    throw e;
  }
}

function read (_id, callback) {
  var _this = this;
  this.find(_id, function (e, record) {
    if (e) {
      callback(e);
    } else if (record) {
      callback(null, _this.rawToRead(record));
    } else { // no data found
      callback(null, null);
    }
  })  
}

function readSync (_id) {
  var data = this.findSync(_id);
  return data ? this.rawToRead(data): null;
}

function readBy (name, value, callback) {
  var _this = this;
  this.findBy(name, value, function (e, record) {
    if (e) {
      callback(e);
    } else if (record) {
      callback(null, _this.rawToRead(record));
    } else {
      callback(null, null);
    }
  });
}

function readBySync (name, value) {
  var data = this.findBySync(name, value);
  return data ? this.rawToRead(data) : null;
}

function readAll (options, callback) {
  var _this = this;
  
  this.findAll(options, function (e, records) {
    if (e) {
      callback(e);
    } else if (records.length > 0) {
      callback(null, _this.rawsToRead(records));    
    } else {
      callback(null, records)
    }
  });

}

function readAllSync (options) {
  var data = this.findAllSync(options);
  return data.length > 0 ? this.rawsToRead(data) : data;
  
}