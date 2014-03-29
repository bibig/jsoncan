/**
 * Table
 * support: find, findBy, findAll, insert, insertAll, update, updateBy, updateAll, remove, removeBy, removeAll
 */

exports.create = create;

var fs = require('fs');
var rander = require('rander');
var async = require('async');
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
function create (ctx, table) {
  var schemas = Schemas.create(ctx.tables[table]);
  var validator = Validator.create(schemas, ctx.validateMessages);
  
  // build table root path and unique fields paths
  ctx.conn.createTablePaths(table, schemas.getUniqueFields());
  
  schemas.getAutoIncrementValue = function (name) {
    return ctx.conn.readTableUniqueAutoIncrementFile(table, name);
  }
  
  
  return {
    table: table,
    conn: ctx.conn,
    schemas: schemas,
    validator: validator,
    inputFields: function () { return this.schemas.inputFields(); }, // 返回所有来自input输入的字段
    read: read,
    readSync: readSync,
    readBy: readBy,
    readBySync: readBySync,
    find: find,
    findBy: findBy,
    findSync: findSync,
    findBySync: findBySync,
    query: query,
    insert: insert,
    insertSync: insertSync,
    insertAll: insertAll,
    insertAllSync: insertAllSync,
    save: save,
    saveSync: saveSync,
    updateBy: updateBy,
    updateBySync: updateBySync,
    update: update,
    updateSync: updateSync,
    updateAll: updateAll,
    updateAllSync: updateAllSync,
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
    resetIdsFile: resetIdsFile,
    resetIndexFile: resetIndexFile,
    resetAllIndexFiles: resetAllIndexFiles
  };
}

/**
 * model way
 */

function model (data) {
  var parent = this; // Table
  var m = {};
  
  m.isNew = data._id ? false : true;
  
  m.data = data;
  
  m.messages = null;
  
  m.get = function (name) { 
    return this.data[name]; 
  };
  
  m.set = function (/*name, value | hash*/) { 
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
  };
  
  m.read = function (name) {
    if (name) {
      return _present.call(parent, name, this.data[name], this.data);
    } else {
      return parent.schemas.presentAll(this.data);
    }
  };
  
  m.validate = function () {
    var data = parent.schemas.addValues(this.data);
    var check = _validate.call(parent, this.data);
    this.messages = check.getMessages();
    this.isValid = check.isValid();
    return this.isValid;
  };
  
  m.getPrimaryId = function () { return this.get('_id'); };
  
  m.save = function (callback) {
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
  };
  
  m.saveSync = function () {
    var _this = this;
    if (this.isNew) { // update
      this.data = parent.insertSync(this.data);        
      this.isNew = false;
    } else {
      this.data = parent.updateSync(this.getPrimaryId(), this.data);
    }
    return this;
  };
  
  m.remove = function (callback) {
    parent.remove(this.getPrimaryId(), callback);
  };
  
  m.removeSync = function () {
    parent.removeSync(this.getPrimaryId());
  };

  m.isValidPassword = function (pass, passwordFieldName) {
    passwordFieldName = passwordFieldName || 'password';
    if (parent.schemas.isType(passwordFieldName, 'password')) { // check whether the field is password
      return parent.schemas.isValidPassword(this.data[passwordFieldName], pass);
    } else {
      return false;
    }
  };
  
  return m;
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

function _present (name, value, data) { 
  return this.schemas.present(name, value, data); 
}

/**
 * remove all the fake fields data
 * @data, ready to save
 */

function _clearFakeFields (data) {
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
function _formatAll (records) {
  var list = [];
  var _this = this;
  records.forEach(function (record) {
    list.push(_this.schemas.presentAll(record));
  });
  return list;
}

function hasKeys (obj) {
  return Object.keys(obj).length > 0;
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
function insert (_data, callback) {
  
  var _this = this;
  var data = this.schemas.filterData(_data); // filter data, make sure it is safe

  // 补充default值, _id值
  data = this.schemas.addValues(data);
  this.save(data, function (e, record) {
    if (e) {
      callback(e);
    } else {
      _linkEachUniqueField.call(_this, record);
      _updateAutoIncrementValues.call(_this, record);
      // add all index records
      _addIndexRecords.call(_this, record);
      _addIdRecord.call(_this, record._id);
      callback(null, record);
    }
  });
}

/**
 * sync way of insert
 */
function insertSync (data) {
  // filter data, make sure it is safe
  data = this.schemas.filterData(data);
  
  // 补充default值, _id值
  data = this.schemas.addValues(data);

  // 保存后的数据
  data = this.saveSync(data);
  
  // link files
  _linkEachUniqueField.call(this, data);
  _updateAutoIncrementValues.call(this, data);
  // add all index records
  _addIndexRecords.call(this, data);
  _addIdRecord.call(this, data._id);
  
  return data;
}

function insertAll (datas, callback) {
  var tasks = _makeInsertTasks.call(this, datas);
  
  if (this.schemas.hasAutoIncrementField()) {
    async.series(tasks, callback);  
  } else {
    async.parallelLimit(tasks, 100, callback);
  }
}

// make insert tasks
function _makeInsertTasks (datas) {
  var _this = this;
  var tasks = [];
  datas.forEach(function (data) {
    tasks.push(function (callback) {
      _this.insert(data, callback);
    });
  });
  return tasks;
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
function _checkEachUniqueField (record, fields) {
  var _this = this;
  this.schemas.forEachUniqueField(function (name, field) {
    _checkUniqueField.call(_this, name, record[name]);
  }, fields);
}

/**
 * 检查unique字段值的唯一性
 * @name: 字段名
 * @value: 值
 * @throw: 1100, 1101
 */
function _checkUniqueField (name, value, isReturn) {
  var linkFile = this.conn.getTableUniqueFile(this.table, name, value);
  if (isReturn) {
    return !fs.existsSync(linkFile);
  } else if (fs.existsSync(linkFile)) {
    throw error(1101, value, name);
  }
}


/**
 * 为每一个unique字段创建一个symbol link文件，指向以本record的id文件
 * 前提：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @fields: 特别指定的字段范围
 */
function _linkEachUniqueField (record, fields) {
  var _this = this;

  this.schemas.forEachUniqueField(function (name, field) {
    _this.conn.linkTableUniqueFileSync(_this.table, record._id, name, record[name]);
  }, fields);
}


/**
 * 删除每一个unique字段的symbol link文件
 * 调用此方法的前提是：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @fields: 特别指定的字段范围
 */
function _unlinkEachUniqueField (record, fields) {
  var _this = this;
  this.schemas.forEachUniqueField(function (name, field) {
    _this.conn.unlinkTableUniqueFileSync(_this.table, name, record[name]);
  }, fields);
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
      _update.call(_this, data, record, callback);
    }
  });
}

/** 
 * update sync version
 */ 
function updateSync (_id, data) {
  var _this = this;
  var record = this.findSync(_id);
  return _updateSync.call(_this, data, record);
}

function updateBy (field, value, data, callback) {
  var _this = this;
  this.findBy(field, value, function (err, record) {
    if (err) {
      callback(err);
    } else if (!record) {
      callback(error(1400, field, value));
    } else {
      _update.call(_this, data, record, callback);
    }
  });
}


/** 
 * updateBy sync version
 */ 
function updateBySync (field, value, data) {
  var record = this.findBySync(field, value);
  if (!record) {
    throw error(1400, field, value);
  }
  return _updateSync.call(this, data, record);
}


/** 
 * 先合并数据，最后再保存数据
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @_data: 要保存的数据
 * @record: 当前数据库中的数据
 * @callback(err, record)
 */ 
function _update (_data, record, callback) {
  var data = this.schemas.filterData(_data); // keep data clean and safe.
  var changedFields = _getChangedFields.call(this, data, record);
  var _this = this;
  
  if (changedFields.length == 0 ) { // 数据没有更改,
    return callback(null, record);
  }
  
  data = _getRealUpdateData.call(this, data, record);
  // 保存之前，删除掉link files
  _unlinkEachUniqueField.call(this, record, changedFields);
  
  this.save(data, function (err, updatedRecord) {
    if (err) {
      // 出错时，要还原link文件
      _linkEachUniqueField.call(_this, record, changedFields);
      callback(err);
    } else {
      _linkEachUniqueField.call(_this, updatedRecord, changedFields);
      _removeIndexRecords.call(_this, record, changedFields);
      _addIndexRecords.call(_this, updatedRecord, changedFields);
      callback(null, updatedRecord);
    }
  }, changedFields);
}

/** 
 * _update sync version
 */ 
function _updateSync (_data, record, callback) {
  var data = this.schemas.filterData(_data);
  var changedFields = _getChangedFields.call(this, data, record);
  var safe;
  
  if (changedFields.length == 0 ) { // 数据没有更改,
    return record;
  }
  
  try{
    _unlinkEachUniqueField.call(this, record, changedFields);
    safe = this.saveSync(_getRealUpdateData.call(this, data, record), changedFields);
    _linkEachUniqueField.call(this, safe, changedFields);
    _removeIndexRecords.call(this, record, changedFields);
    _addIndexRecords.call(this, safe, changedFields);
    return safe;
  } catch (e) {
    _linkEachUniqueField.call(this, record, changedFields);
    throw e;
  }
}

function _getChangedFields (data, record) {
  var fields = [];
  this.schemas.forEachField(function (name, field, _this) {
    if (_this.isReadOnly(field)) { return; }
    if (data[name] == undefined) { return; }
    
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
function _getRealUpdateData (data, record) {
  var target = {}; // 避免data中夹杂schemas没有定义的数据
  this.schemas.forEachField(function (name, field) {
    if (data[name] == undefined) {
      target[name] = record[name];
    } else {
      target[name] = data[name];
    }
  });
  
  return this.schemas.addValues(target);
}


function updateAll (options, data, callback) {
  var _this = this;
  
  function makeUpdateTasks (records) {
    var tasks = [];
    
    records.forEach(function (record) {
      tasks.push(function (callback) {
        _update.call(_this, data, record, callback);
      });
    });
    
    return tasks;
  }
  
  this.query(options).exec(function (err, records) {
    var tasks;
    if (err) {
      callback(err);
    } else {
      if (records.length > 0) { // no data found after filter,
        tasks = makeUpdateTasks(records);
        async.parallelLimit(tasks, 150, callback);
      } else {
        callback(null);
      }
    }
    
  });

}

function updateAllSync (options, data) {
  var _this = this;
  var results = [];
  var records = this.query(options).execSync();
  records.forEach(function (record) {
    results.push(_updateSync.call(_this, data, record));
  });
  return results;
}

/** 
 * 物理删除一条记录
 * 如果有unique字段，需要挨个清除掉unique字段的link文件
 * @_id: primary id
 * @callback(err)
 */

function remove (_id, callback) { 
  var _this = this;
  this.find(_id, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _remove.call(_this, record, callback);
    }
  });
}

function removeSync (_id) {
  if (this.schemas.hasUniqueField()) {
    _removeSync.call(this, this.findSync(_id));
  } else {
    this.conn.removeSync(this.table, _id);
  }
}

function _remove (record, callback) {
  var _this = this;
  // no data found
  if (!record) {
    callback();
  } else {
    this.conn.remove(this.table, record._id, function (e) {
      if (e) {
        callback(e);
      } else {
        _unlinkEachUniqueField.call(_this, record);
        _removeIndexRecords.call(_this, record);
        _removeIdRecord.call(_this, record._id);
        callback(null, record);
      }
    });
  }
}

function _removeSync (record) {
  if (!record) return;
  this.conn.removeSync(this.table, record._id);
  _unlinkEachUniqueField.call(this, record);
  _removeIndexRecords.call(this, record);
  _removeIdRecord.call(this, record._id);
}

function removeBy (field, value, callback) {
  var _this = this;
  
  this.findBy(field, value, function (err, record) {
    if (err) {
      callback(err);
    } else {
      _remove.call(_this, record, callback);
    }
  });
};

function removeBySync (field, value, callback) {
  this.removeSync(this.findBySync(field, value));
};

function removeAll (options, callback) {
  var _this = this;
  
  function makeRemoveTasks (records) {
    var tasks = [];
    
    records.forEach(function (record) {
      tasks.push(function (callback) {
        _remove.call(_this, record, callback);
      });
    });
    
    return tasks;
  }
  
  this.query(options).exec(function (err, records) {
    if (err) {
      callback(err);
    } else {
      if (records.length > 0) {
        async.parallelLimit(makeRemoveTasks(records), 150, callback);
        /*
        async.each(records, _this._remove.bind(_this), function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null);
          }
        });
        */
      } else {
        callback(null);
      }
    }
  });
  
}

function removeAllSync (options, callback) {
  var _this = this;
  var records = this.query(options).select().execSync();
  records.forEach(function (record) {
    _removeSync.call(_this, record);
  });
  return records;
}

function find (_id, callback) { 
  if (Validator.isEmpty(_id)) { return null; }
  this.conn.read(this.table, _id, callback);
}

function findBy (name, value, callback) {
  if (!this.schemas.isUnique(name)) { throw error(1003, name); }
  if (Validator.isEmpty(name, value)) { return null; }
  this.conn.readBy(this.table, name, value, callback); 
}

function findSync (_id) { 
  if (Validator.isEmpty(_id)) { return null; }
  return this.conn.readSync(this.table, _id); 
}

function findBySync (name, value) {
  if (!this.schemas.isUnique(name)) { throw error(1003, name); }
  if (Validator.isEmpty(name, value)) { return null; }
  return this.conn.readBySync(this.table, name, value); 
}


function _validate (data, changedFields) {
  var _this = this;

  this.validator.isUnique = function (name, field, value) {
    return _checkUniqueField.call(_this, name, value, true);
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
  var check = _validate.call(this, data, changedFields);
  
  if (check.isValid()) {
    data = _clearFakeFields.call(this, data);
    // 对需要转换的数据进行转换
    data = this.schemas.convertEachField(data, changedFields);
    this.conn.save(this.table, data._id, data, callback);
  } else {
    e = error(1300); 
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
  var check = _validate.call(this, data, changedFields);
  
  if (check.isValid()) {
    data = _clearFakeFields.call(this, data);
    data = this.schemas.convertEachField(data, changedFields);
    return this.conn.saveSync(this.table, data._id, data); 
  } else {
    e = error(1300); 
    e.invalidMessages = check.getMessages();
    e.invalid = true;
    throw e;
  }
}

function _addIndexRecords (data, targetFields) {
  var _this = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    _this.conn.addIndexRecord(_this.table, name, data[name], data._id);
  }, targetFields);
}

function _removeIndexRecords (data, targetFields) {
  var _this = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    _this.conn.removeIndexRecord(_this.table, name, data[name], data._id);
  }, targetFields);
}


function _addIdRecord (_id) {
  this.conn.addIdRecord(this.table, _id);
}

function _removeIdRecord (_id) {
  this.conn.removeIdRecord(this.table, _id);
}


function read (_id, callback) {
  var _this = this;
  this.find(_id, function (e, record) {
    if (e) {
      callback(e);
    } else if (record) {
      callback(null, _this.schemas.presentAll(record));
    } else { // no data found
      callback(null, null);
    }
  })  
}

function readSync (_id) {
  var data = this.findSync(_id);
  return data ? this.schemas.presentAll(data): null;
}

function readBy (name, value, callback) {
  var _this = this;
  this.findBy(name, value, function (e, record) {
    if (e) {
      callback(e);
    } else if (record) {
      callback(null, _this.schemas.presentAll(record));
    } else {
      callback(null, null);
    }
  });
}

function readBySync (name, value) {
  var data = this.findBySync(name, value);
  return data ? this.schemas.presentAll(data) : null;
}

function _updateAutoIncrementValues (data) {
  var _this = this;
  this.schemas.forEachUniqueField(function (name, field, schemas) {
    var nextValue;
    if (schemas.isAutoIncrement(field)) {
      nextValue = schemas.getNextAutoIncrementValue(name, data[name]);
      _this.conn.writeTableUniqueAutoIncrementFile(_this.table, name, nextValue)
    }
  });
}

function _getIndexOrders (orders) {
  var indexOrders = {};
  
  if (!orders) return {};
  
  this.schemas.forEachIndexField(function (name, field) {
    indexOrders[name] = orders[name];
  }, orders);
  
  return indexOrders;
}

function _getNoneIndexOrders (orders) {
  var noneIndexOrders = {};
  
  if (!orders) return {};
  
  this.schemas.forEachField(function (name, field, that) {
    if (!that.isIndex(field)) {
      noneIndexOrders[name] = orders[name];
    }
  }, orders);
  
  return noneIndexOrders;
}

function _getIndexFilters (options) {
  var indexOptions = {};
  
  if (!options) return {};
  // console.log(options);
  this.schemas.forEachIndexField(function (name, field) {
    indexOptions[name] = options[name];
  }, options);
  
  if (hasKeys(indexOptions)) {
    return this.schemas.convertEachField(indexOptions, indexOptions);
  } else {
    return {};
  }
}

function _getNoneIndexFilters (options) {
  var noneIndexOptions = {};
  
  if (!options) return {};
  
  this.schemas.forEachField(function (name, field, that) {
    if (!that.isIndex(field)) {
      noneIndexOptions[name] = options[name];
    }
  }, options);
  
  if (hasKeys(noneIndexOptions)) {
    return this.schemas.convertEachField(noneIndexOptions, noneIndexOptions);
  } else {
    return {};
  }
}

function _queryAll (options, callback) {
  var _this = this;

  async.waterfall([
    function (callback) {
      var indexFilters = _getIndexFilters.call(_this, options.filters);
      var indexFilterKeys = Object.keys(indexFilters);
      var indexOrders = _getIndexOrders.call(_this, options.orders);
      var indexOrderKeys = Object.keys(indexOrders);
      var usedIndexKeys = _mergeArrays(indexFilterKeys, indexOrderKeys);
      
      _this.conn.readAllIndexes(_this.table, _getConnQueryIndexKeys.call(_this, usedIndexKeys), function (e, records) {
        var ids;
        if (e) {
          callback(e);
        } else {
          ids = _getIdsFromIndexRecords.call(_this, records, options);
          callback(null, ids);
        }
      });
    },
    
    function (ids, callback) {
      _this.conn.queryAll(_this.table, ids, _makeConnQueryOptions.call(_this, options), function (e, records) {
        if (e) {
          callback(e);
        } else {
          callback(null, _localQuery.call(_this, records, options)); 
        }
      });
    }
  
  ], callback);
}

function _queryAllSync (options) {
  var indexFilters = _getIndexFilters.call(this, options.filters);
  var indexFilterKeys = Object.keys(indexFilters);
  var indexOrders = _getIndexOrders.call(this, options.orders);
  var indexOrderKeys = Object.keys(indexOrders);
  var usedIndexKeys = _mergeArrays(indexFilterKeys, indexOrderKeys);
  var indexRecords = this.conn.readAllIndexesSync(this.table, _getConnQueryIndexKeys.call(this, usedIndexKeys));
  var ids = _getIdsFromIndexRecords.call(this, indexRecords, options);
  var records = this.conn.queryAllSync(this.table, ids, _makeConnQueryOptions.call(this, options));
  
  return _localQuery.call(this, records, options);
}

function _getConnQueryIndexKeys (usedIndexKeys) {
  var map = {};
  var _this = this;
  usedIndexKeys.forEach(function (name) {
    map[name] = _this.schemas.fieldValueConvertFn(name);
  });
  return map;
}

function _getIdsFromIndexRecords (records, options) {
  var indexFilters = _getIndexFilters.call(this, options.filters);
  var indexOrders = _getIndexOrders.call(this, options.orders);
  var query = Query.create(records).filter(indexFilters);
  // console.log(records);
  // using index orders
  Object.keys(indexOrders).forEach(function (name) {
    query.order(name, indexOrders[name]);
  });
  
  return query.key('_id');
}

function _makeConnQueryOptions (options) {
  var noneIndexFilters = _getNoneIndexFilters.call(this, options.filters);
  var noneIndexOrders = _getNoneIndexOrders.call(this, options.orders);
  var noneIndexOrdersKeys = Object.keys(noneIndexOrders);
  var newOptions = { filters: noneIndexFilters };
  
  if (noneIndexOrdersKeys.length == 0) {
    newOptions.limit = options.limit;
    newOptions.skip = options.skip;
  }
  
  return newOptions;
}

function _mergeArrays (a, b) {
  var c = [].concat(a);
  
  b.forEach(function (key) {
    if (c.indexOf(key) == -1) {
      c.push(key);
    }
  });
  
  return c;
}

function _localQuery (records, options) {
  var noneIndexFilters = _getNoneIndexFilters.call(this, options.filters);
  var noneIndexOrders = _getNoneIndexOrders.call(this, options.orders);
  var noneIndexOrdersKeys = Object.keys(noneIndexOrders);
  var query;

  if (noneIndexOrdersKeys.length > 0) {
    query = Query.create(records);
    noneIndexOrdersKeys.forEach(function (name) {
      query = query.order(name, noneIndexOrders[name]);
    });
    
    if (options.skip) {
      query = query.skip(options.skip);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    records = query.select();
  }
  
  if (options.select) {
    if (!query) {
      query = Query.create(records);
    }
    records = query.select(options.select);
  }
  
  return records;
}

// new version of query
function query (filters) {
  var parent = this;
  
  function where (field/*filter*/) {
    var filter;
  
    if (arguments.length == 2) {
      filter = arguments[1];
    } else if (arguments.length == 3) {
      filter = [arguments[1], arguments[2]];
    } else {
      return this;
    }
    
    this.options.filters[field] = filter;
    return this;
  }
  
  function order (field, isDescend) {
    this.options.orders[field] = isDescend ? true : false;
    return this;
  }
  
  function limit (n) {
    this.options.limit = n;
    return this;
  }
  
  function skip (n) {
    this.options.skip = n;
    return this;
  }
  
  function select () {
    var args = [];
    if (arguments.length == 1) {
      this.options.select = arguments[0];
    } else if (arguments.length > 1) {
      for (var i = 0; i < arguments.length; i++ ) {
        args.push(arguments[i]);
      }
      this.options.select = args;
    }
    
    //  console.log(this.options.select);
    return this;
  }
  
  function format () {
    this.options.isFormat = true;
    return this;
  }
  
  function exec (callback) {
    // console.log(this.options);
    // console.log(this.options.orders);
    var _this = this;
    _queryAll.call(parent, this.options, function (e, records) {
      if (e) {
        callback(e);
      } else if (_this.options.isFormat) {
        callback(null, _formatAll.call(parent, records));
      } else {
        callback(null, records);
      }
    });
  }
  
  function execSync () {
    var records = _queryAllSync.call(parent, this.options);
    if (this.options.isFormat) {
      return _formatAll.call(parent, records);
    } else {
      return records;
    }
  }
  

  return {
    options: {
      filters: filters || {},
      orders: {},
      limit: null,
      skip: null,
      select: null,
      isFormat: false
    },
    where: where,
    order: order,
    limit: limit,
    skip: skip,
    select: select,
    format: format,
    exec: exec,
    execSync: execSync
  };
}

function resetIdsFile () {
  var ids = this.conn.readAllIdsInDirSync(this.table);
  this.conn.resetIdsFile(this.table, ids);
}

function resetAllIndexFiles () {
  var _this = this;
  this.schemas.forEachIndexField(function (name) {
    _this.resetIndexFile(name);
  });
}

function resetIndexFile (name) {
  this.conn.resetIndexFile(this.table, name);
}
