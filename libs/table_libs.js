exports.find = find;
exports.findSync = findSync;
exports.findBy = findBy;
exports.findBySync = findBySync;
exports.findAll = findAll;
exports.findAllSync = findAllSync;
exports.update = update;
exports.updateSync = updateSync;
exports.remove = remove;
exports.removeSync = removeSync;
exports.present = present;
exports.format = format;
exports.formatAll = formatAll;
exports.makeInsertTasks = makeInsertTasks;
exports.checkUniqueFieldValue = checkUniqueFieldValue;
exports.linkEachUniqueField = linkEachUniqueField;
exports.unlinkEachUniqueField = unlinkEachUniqueField;
exports.validate = validate;
exports.addIndexRecords = addIndexRecords;
exports.removeIndexRecords = removeIndexRecords;
exports.addIdRecord = addIdRecord;
exports.removeIdRecord = removeIdRecord;
exports.updateAutoIncrementValues = updateAutoIncrementValues;
exports.getIndexOrders = getIndexOrders;
exports.getNoneIndexOrders = getNoneIndexOrders;
exports.getIndexFilters = getIndexFilters;
exports.getNoneIndexFilters = getNoneIndexFilters;
exports.getConnQueryIndexKeys = getConnQueryIndexKeys;
exports.getIdsFromIndexRecords = getIdsFromIndexRecords;
exports.makeConnQueryOptions = makeConnQueryOptions;
exports.localQuery = localQuery;
exports.arrayToMap = arrayToMap;

var Query = require('./query');
var error = require('./error');
var async = require('async');
var fs = require('fs');
var utils = require('./utils');
var Validator = require('./validator');

function find (_id, callback) { 
  if (Validator.isEmpty(_id)) { return callback(); }
  this.conn.read(this.table, _id, callback);
}

function findSync (_id) { 
  if (Validator.isEmpty(_id)) { return null; }
  return this.conn.readSync(this.table, _id); 
}

function findBy (name, value, callback) {
  this.checkUniqueField(name);
  if (Validator.isEmpty(name, value)) { return callback(); }
  this.conn.readBy(this.table, name, value, callback); 
}

function findBySync (name, value) {
  this.checkUniqueField(name);
  if (Validator.isEmpty(name, value)) { return null; }
  return this.conn.readBySync(this.table, name, value); 
}

function present (name, value, data) { 
  return this.schemas.present(name, value, data); 
}

/**
 * 将每条记录的所有hash字段的键值转换成desc
 * @records: 记录列表
 * @return 转换好的列表
 */
function formatAll (records) {
  var list = [];
  var self = this;
  records.forEach(function (record) {
    // list.push(self.schemas.presentAll(record));
    list.push(format.call(self, record));
  });
  return list;
}

function format (record) {
  return this.schemas.presentAll(record);
}

// make insert tasks
function makeInsertTasks (datas) {
  var self = this;
  var tasks = [];
  datas.forEach(function (data) {
    tasks.push(function (callback) {
      self.insert(data, callback);
    });
  });
  return tasks;
}

/**
 * 检查unique字段值的唯一性
 * @name: 字段名
 * @value: 值
 * @throw: 1100, 1101
 */
function checkUniqueFieldValue (name, value, isReturn) {
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
function linkEachUniqueField (record, fields) {
  var self = this;

  this.schemas.forEachUniqueField(function (name, field) {
    self.conn.linkTableUniqueFileSync(self.table, record._id, name, record[name]);
  }, fields);
}

/**
 * 删除每一个unique字段的symbol link文件
 * 调用此方法的前提是：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @fields: 特别指定的字段范围
 */
function unlinkEachUniqueField (record, fields) {
  var self = this;
  this.schemas.forEachUniqueField(function (name, field) {
    self.conn.unlinkTableUniqueFileSync(self.table, name, record[name]);
  }, fields);
}

/** 
 * 先合并数据，最后再保存数据
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @_data: 要保存的数据
 * @record: 当前数据库中的数据
 * @callback(err, record)
 */ 
function update (_data, record, callback) {
  var data = this.schemas.filterData(_data); // keep data clean and safe.
  var changedFields = this.schemas.getChangedFields(data, record);
  var self = this;
  
  if (changedFields.length == 0 ) { // 数据没有更改,
    return callback(null, record);
  }
  
  data = this.schemas.getRealUpdateData(data, record);
  // 保存之前，删除掉link files
  unlinkEachUniqueField.call(this, record, changedFields);
  
  this.save(data, function (err, updatedRecord) {
    if (err) {
      // 出错时，要还原link文件
      linkEachUniqueField.call(self, record, changedFields);
      callback(err);
    } else {
      linkEachUniqueField.call(self, updatedRecord, changedFields);
      removeIndexRecords.call(self, record, changedFields);
      addIndexRecords.call(self, updatedRecord, changedFields);
      callback(null, updatedRecord);
    }
  }, changedFields);
}


/** 
 * _update sync version
 */ 
function updateSync (_data, record, callback) {
  var data = this.schemas.filterData(_data);
  var changedFields = this.schemas.getChangedFields(data, record);
  var safe;
  
  if (changedFields.length == 0 ) { // 数据没有更改,
    return record;
  }
  
  try{
    unlinkEachUniqueField.call(this, record, changedFields);
    safe = this.saveSync(this.schemas.getRealUpdateData(data, record), changedFields);
    linkEachUniqueField.call(this, safe, changedFields);
    removeIndexRecords.call(this, record, changedFields);
    addIndexRecords.call(this, safe, changedFields);
    return safe;
  } catch (e) {
    linkEachUniqueField.call(this, record, changedFields);
    throw e;
  }
}

function remove (record, callback) {
  var self = this;
  // no data found
  if (!record) {
    callback();
  } else {
    this.conn.remove(this.table, record._id, function (e) {
      if (e) {
        callback(e);
      } else {
        unlinkEachUniqueField.call(self, record);
        removeIndexRecords.call(self, record);
        removeIdRecord.call(self, record._id);
        callback(null, record);
      }
    });
  }
}

function removeSync (record) {
  if (!record) return;
  this.conn.removeSync(this.table, record._id);
  unlinkEachUniqueField.call(this, record);
  removeIndexRecords.call(this, record);
  removeIdRecord.call(this, record._id);
}

function validate (data, changedFields) {
  var self = this;

  this.validator.isUnique = function (name, field, value) {
    return checkUniqueFieldValue.call(self, name, value, true);
  };
  
  return this.validator.check(data, changedFields);
}

function addIndexRecords (data, targetFields) {
  var self = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    self.conn.addIndexRecord(self.table, name, data[name], data._id);
  }, targetFields);
}

function removeIndexRecords (data, targetFields) {
  var self = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    self.conn.removeIndexRecord(self.table, name, data[name], data._id);
  }, targetFields);
}

function addIdRecord (_id) {
  this.conn.addIdRecord(this.table, _id);
}

function removeIdRecord (_id) {
  this.conn.removeIdRecord(this.table, _id);
}

function updateAutoIncrementValues (data) {
  var self = this;
  this.schemas.forEachUniqueField(function (name, field, schemas) {
    var nextValue;
    if (schemas.isAutoIncrement(field)) {
      nextValue = schemas.getNextAutoIncrementValue(name, data[name]);
      self.conn.writeTableUniqueAutoIncrementFile(self.table, name, nextValue)
    }
  });
}

function getIndexOrders (orders) {
  var indexOrders = {};
  
  if (!orders) return {};
  
  this.schemas.forEachIndexField(function (name, field) {
    indexOrders[name] = orders[name];
  }, orders);
  
  return indexOrders;
}

function getNoneIndexOrders (orders) {
  var noneIndexOrders = {};
  
  if (!orders) return {};
  
  this.schemas.forEachField(function (name, field, that) {
    if (!that.isIndex(field)) {
      noneIndexOrders[name] = orders[name];
    }
  }, orders);
  
  return noneIndexOrders;
}

function getIndexFilters (options) {
  var indexOptions = {};
  
  if (!options) return {};
  this.schemas.forEachIndexField(function (name, field) {
    indexOptions[name] = options[name];
  }, options);
  
  if (utils.hasKeys(indexOptions)) {
    return this.schemas.convertEachField(indexOptions, indexOptions);
  } else {
    return {};
  }
}

function getNoneIndexFilters (options) {
  var noneIndexOptions = {};
  
  if (!options) return {};
  
  this.schemas.forEachField(function (name, field, that) {
    if (!that.isIndex(field)) {
      noneIndexOptions[name] = options[name];
    }
  }, options);
  
  if (utils.hasKeys(noneIndexOptions)) {
    return this.schemas.convertEachField(noneIndexOptions, noneIndexOptions);
  } else {
    return {};
  }
}

function findAll (options, callback) {
  var self = this;
  this.checkFields(options.filters);
  this.checkFields(options.orders);

  async.waterfall([
    function (callback) {
      var indexFilters = getIndexFilters.call(self, options.filters);
      var indexFilterKeys = Object.keys(indexFilters);
      var indexOrders = getIndexOrders.call(self, options.orders);
      var indexOrderKeys = Object.keys(indexOrders);
      var usedIndexKeys = utils.mergeArray(indexFilterKeys, indexOrderKeys);
      
      self.conn.readAllIndexes(self.table, getConnQueryIndexKeys.call(self, usedIndexKeys), function (e, records) {
        var ids;
        if (e) {
          callback(e);
        } else {
          ids = getIdsFromIndexRecords.call(self, records, options);
          callback(null, ids);
        }
      });
    },
    
    function (ids, callback) {
      self.conn.queryAll(self.table, ids, makeConnQueryOptions.call(self, options), function (e, records) {
        if (e) {
          callback(e);
        } else {
          callback(null, localQuery.call(self, records, options)); 
        }
      });
    }
  
  ], callback);
}

function findAllSync (options) {
  var indexFilters, indexFilterKeys, indexOrders, indexOrderKeys, usedIndexKeys, indexRecords, ids, records;  
  this.checkFields(options.filters);
  this.checkFields(options.orders);
  
  indexFilters = getIndexFilters.call(this, options.filters);
  indexFilterKeys = Object.keys(indexFilters);
  indexOrders = getIndexOrders.call(this, options.orders);
  indexOrderKeys = Object.keys(indexOrders);
  usedIndexKeys = utils.mergeArray(indexFilterKeys, indexOrderKeys);
  indexRecords = this.conn.readAllIndexesSync(this.table, getConnQueryIndexKeys.call(this, usedIndexKeys));
  ids = getIdsFromIndexRecords.call(this, indexRecords, options);
  records = this.conn.queryAllSync(this.table, ids, makeConnQueryOptions.call(this, options));
  
  return localQuery.call(this, records, options);
}

function getConnQueryIndexKeys (usedIndexKeys) {
  var map = {};
  var self = this;
  usedIndexKeys.forEach(function (name) {
    map[name] = self.schemas.fieldValueConvertFn(name);
  });
  return map;
}

function getIdsFromIndexRecords (records, options) {
  var indexFilters = getIndexFilters.call(this, options.filters);
  var indexOrders = getIndexOrders.call(this, options.orders);
  var query = Query.create(records).filter(indexFilters);
  // using index orders
  Object.keys(indexOrders).forEach(function (name) {
    query.order(name, indexOrders[name]);
  });
  
  return query.key('_id');
}

function makeConnQueryOptions (options) {
  var noneIndexFilters = getNoneIndexFilters.call(this, options.filters);
  var noneIndexOrders = getNoneIndexOrders.call(this, options.orders);
  var noneIndexOrdersKeys = Object.keys(noneIndexOrders);
  var newOptions = { filters: noneIndexFilters };
  
  if (noneIndexOrdersKeys.length == 0) {
    newOptions.limit = options.limit;
    newOptions.skip = options.skip;
  }
  
  return newOptions;
}

function localQuery (records, options) {
  var noneIndexOrders = getNoneIndexOrders.call(this, options.orders);
  var noneIndexOrdersKeys = Object.keys(noneIndexOrders);
  var self = this;
  var query, fields;

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
  
  if (query) {
    fields = query.fields;
  }
  
  // should keep the value type integrated with the schemas definition.
  records.forEach(function (record) {
    // self.schemas.addDefaultValues(record, fields);
    self.schemas.convertBackEachField(record);
  });
  
  return records;
}

function arrayToMap (records) {
  var map = {};
  records.forEach(function (record) {
    map[record._id] = record;
  });
  return map;
}