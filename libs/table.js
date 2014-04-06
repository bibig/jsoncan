/**
 * Table
 * support: find, findBy, findAll, insert, insertAll, update, updateBy, updateAll, remove, removeBy, removeAll
 */

exports.create = create;

var fs = require('fs');
var rander = require('rander');
var async = require('async');
var Schemas = require('./schemas');
var error = require('./error');
var Validator = require('./validator');
var safepass = require('safepass');
var utils = require('./utils');
var libs = require('./table_libs');
var Query = require('./table_query');
var Model = require('./table_model');
var Finder = require('./table_finder');

/**
 * create table object
 *  
 * @conn: connection
 * @table: table name
 * @fields: schemas
 * @return Object
 */
function create (conn, table) {
  var schemas = Schemas.create(conn.tables[table]);
  var validator = Validator.create(schemas, conn.validateMessages);
  
  // build table root path and unique fields paths
  conn.createTablePaths(table, schemas.getUniqueFields());
  
  schemas.getAutoIncrementValue = function (name) {
    return conn.readTableUniqueAutoIncrementFile(table, name);
  }
  
  
  return {
    table: table,
    conn: conn,
    schemas: schemas,
    validator: validator,
    inputFields: function () { return this.schemas.inputFields(); }, // ready to deprecate
    getFields: function () { return this.schemas.fields; },
    checkFields: checkFields,
    checkField: checkField,
    checkTable: checkTable,
    checkUniqueField: checkUniqueField,
    checkReference: checkReference,
    find: Finder.find,
    findBy: Finder.findBy,
    finder: Finder.create,
    findAll: Query.create,
    query: Query.create,
    count: count,
    countSync: countSync,
    
    findInOtherTable: findInOtherTable,
    findInOtherTableSync: findInOtherTableSync,
    findAllBelongsTo: findAllBelongsTo,
    findAllBelongsToSync: findAllBelongsToSync,
    findAllHasMany: findAllHasMany,
    findAllHasManySync: findAllHasManySync,
    
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
    model: Model.create,
    create: Model.create, // alias model
    load: load,
    loadBy: loadBy,
    refresh: refresh,
    resetIdsFile: resetIdsFile,
    resetIndexFile: resetIndexFile,
    resetAllIndexFiles: resetAllIndexFiles
  };
}

function load (_id) {
  var data = this.finder(_id).execSync();
  if (!data) { return null; }
  return this.model(data);
}

function loadBy(name, value) {
  var data = this.finder(name, value).execSync();
  if (!data) { return null; }
  return this.model(data);
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
  
  var self = this;
  var data = this.schemas.filterData(_data); // filter data, make sure it is safe

  // 补充default值, _id值
  data = this.schemas.addValues(data);
  this.save(data, function (e, record) {
    if (e) {
      callback(e);
    } else {
      libs.linkEachUniqueField.call(self, record);
      libs.updateAutoIncrementValues.call(self, record);
      // add all index records
      libs.addIndexRecords.call(self, record);
      libs.addIdRecord.call(self, record._id);
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
  libs.linkEachUniqueField.call(this, data);
  libs.updateAutoIncrementValues.call(this, data);
  // add all index records
  libs.addIndexRecords.call(this, data);
  libs.addIdRecord.call(this, data._id);
  
  return data;
}

function insertAll (datas, callback) {
  var tasks = libs.makeInsertTasks.call(this, datas);
  
  if (this.schemas.hasAutoIncrementField()) {
    async.series(tasks, callback);  
  } else {
    async.parallelLimit(tasks, 100, callback);
  }
}

function insertAllSync (records) {
  var self = this;
  var results = [];
  
  records.forEach(function (record) {
    results.push(self.insertSync(record));
  });
  
  return results;
}

/** 
 * 先根据data._id查出整个记录，然后合并数据，最后再保存数据
 * 如果unique字段更改，需要删除旧的link文件，建立新的link文件
 * @data: 要保存的数据
 * @callback(err, record)
 */ 
function update (_id, data, callback) {
  var self = this;
  
  this.find(_id).exec(function (err, record) {
    if (err) {
      callback(err);
    } else {
      libs.update.call(self, data, record, callback);
    }
  });
}

/** 
 * update sync version
 */ 
function updateSync (_id, data) {
  var self = this;
  var record = this.find(_id).execSync();
  return libs.updateSync.call(self, data, record);
}

function updateBy (field, value, data, callback) {
  var self = this;
  this.findBy(field, value).exec(function (err, record) {
    if (err) {
      callback(err);
    } else if (!record) {
      callback(error(1400, field, value));
    } else {
      libs.update.call(self, data, record, callback);
    }
  });
}


/** 
 * updateBy sync version
 */ 
function updateBySync (field, value, data) {
  var record = this.findBy(field, value).execSync();
  if (!record) {
    throw error(1400, field, value);
  }
  return libs.updateSync.call(this, data, record);
}

function updateAll (options, data, callback) {
  var self = this;
  
  function _makeUpdateTasks (records) {
    var tasks = [];
    
    records.forEach(function (record) {
      tasks.push(function (callback) {
        libs.update.call(self, data, record, callback);
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
        tasks = _makeUpdateTasks(records);
        async.parallelLimit(tasks, 150, callback);
      } else {
        callback(null);
      }
    }
    
  });

}

function updateAllSync (options, data) {
  var self = this;
  var results = [];
  var records = this.query(options).execSync();
  records.forEach(function (record) {
    results.push(libs.updateSync.call(self, data, record));
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
  var self = this;
  this.finder(_id).exec(function (err, record) {
    if (err) {
      callback(err);
    } else {
      libs.remove.call(self, record, callback);
    }
  });
}

function removeSync (_id) {
  if (this.schemas.hasUniqueField()) {
    libs.removeSync.call(this, this.finder(_id).execSync());
  } else {
    this.conn.removeSync(this.table, _id);
  }
}



function removeBy (field, value, callback) {
  var self = this;
  
  this.finder(field, value).exec(function (err, record) {
    if (err) {
      callback(err);
    } else {
      libs.remove.call(self, record, callback);
    }
  });
};

function removeBySync (field, value, callback) {
  this.removeSync(this.finder(field, value).execSync());
};

function removeAll (options, callback) {
  var self = this;
  
  function _makeRemoveTasks (records) {
    var tasks = [];
    
    records.forEach(function (record) {
      tasks.push(function (callback) {
        libs.remove.call(self, record, callback);
      });
    });
    
    return tasks;
  }
  
  this.query(options).exec(function (err, records) {
    if (err) {
      callback(err);
    } else {
      if (records.length > 0) {
        async.parallelLimit(_makeRemoveTasks(records), 150, callback);
      } else {
        callback(null);
      }
    }
  });
  
}

function removeAllSync (options, callback) {
  var self = this;
  var records = this.query(options).select().execSync();
  records.forEach(function (record) {
    libs.removeSync.call(self, record);
  });
  return records;
}

function checkFields (names) {
  var self = this;
  if (!Array.isArray(names)) {
    if (typeof names == 'object') {
      names = Object.keys(names);
    } else {
      names = [];
    }
  }
  
  names.forEach(function (name) {
    self.checkField(name);
  });
}

function checkTable (name) {
  if (!this.conn.tables[name]) {
    throw error(1005, name);
  }
}

function checkField (name) {
  if (!this.schemas.isField(name)) {
    throw error(1003, name);
  }
}

function checkUniqueField (name) {
  this.checkField(name);
  if (!this.schemas.isUnique(name)) { 
    throw error(1004, name); 
  }
}

function checkReference (table, name) {
  if (this.conn.tables[table] && this.schemas.isField(name)) {
    return true;
  }
  throw error(1006, name);
}




/**
 * 保存数据
 * @data: 要保存的数据
 * @callback(err, data or invalid messages)
 *  error 1300 表示数据校验失败
 */
function save (data, callback, changedFields) {
  var e;
  var check = libs.validate.call(this, data, changedFields);
  
  if (check.isValid()) {
    data = this.schemas.clearFakeFields(data);
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
  var check = libs.validate.call(this, data, changedFields);
  if (check.isValid()) {
    data = this.schemas.clearFakeFields(data);
    data = this.schemas.convertEachField(data, changedFields);
    return this.conn.saveSync(this.table, data._id, data); 
  } else {
    e = error(1300); 
    e.invalidMessages = check.getMessages();
    e.invalid = true;
    // console.error(e);
    throw e;
  }
}

/*
function read (_id, callback) {
  var self = this;
  this.find(_id, function (e, record) {
    if (e) {
      callback(e);
    } else if (record) {
      callback(null, self.schemas.presentAll(record));
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
  var self = this;
  this.findBy(name, value, function (e, record) {
    if (e) {
      callback(e);
    } else if (record) {
      callback(null, self.schemas.presentAll(record));
    } else {
      callback(null, null);
    }
  });
}

function readBySync (name, value) {
  var data = this.findBySync(name, value);
  return data ? this.schemas.presentAll(data) : null;
}
*/

function count (filters, callback) {
  var self = this;
  this.checkFields(filters);
  
  async.waterfall([
    function (callback) {
      var indexFilters = libs.getIndexFilters.call(self, filters);
      var indexFilterKeys = Object.keys(indexFilters);
      self.conn.readAllIndexes(self.table, libs.getConnQueryIndexKeys.call(self, indexFilterKeys), function (e, records) {
        var ids;
        if (e) {
          callback(e);
        } else {
          ids = libs.getIdsFromIndexRecords.call(self, records, { filters: indexFilters });
          callback(null, ids);
        }
      });
    },
    function (ids, callback) {
      var noneIndexFilters = libs.getNoneIndexFilters.call(self, filters);
      var noneIndexFilterKeys = Object.keys(noneIndexFilters);
      if (noneIndexFilterKeys.length > 0) {
        self.conn.queryAll(self.table, ids, libs.makeConnQueryOptions.call(self, { filters: noneIndexFilters }), function (e, records) {
          callback(null, records.length);
        });
      } else {
        callback(null, ids.length);
      }
    }
  ], callback);
}

function countSync (filters) {
  var indexFilters, indexFilterKeys, noneIndexFilters, noneIndexFilterKeys, ids, records;
  this.checkFields(filters);
  
  indexFilters = libs.getIndexFilters.call(this, filters);
  indexFilterKeys = Object.keys(indexFilters);
  noneIndexFilters = libs.getNoneIndexFilters.call(this, filters);
  noneIndexFilterKeys = Object.keys(noneIndexFilters);
  records = this.conn.readAllIndexesSync(this.table, libs.getConnQueryIndexKeys.call(this, indexFilterKeys));
  ids = libs.getIdsFromIndexRecords.call(this, records, { filters: indexFilters });
  
  if (noneIndexFilterKeys.length == 0) {
    return ids.length;  
  } else {
    return this.conn.queryAllSync(this.table, ids, libs.makeConnQueryOptions.call(this, { filters: noneIndexFilters })).length;
  }
}

function findAllBelongsTo (ref, callback) {
  var Reference = create(this.conn, ref.table);
  var fields = utils.clone(ref.fields);
  if (Array.isArray(fields)) {
    fields.unshift('_id');
  }
  Reference.query(ref.filters || {}).select(fields).map().exec(callback);
}

function findAllBelongsToSync (ref) {
  var Reference = create(this.conn, ref.table);
  var fields = utils.clone(ref.fields);
  fields.unshift('_id');
  return Reference.query(ref.filters || {}).select(fields).map().execSync();
}

function findInOtherTable (_id, table, callback) {
  var Table = create(this.conn, table);
  Table.finder(_id).exec(callback);
}

function findInOtherTableSync (_id, table) {
  var Table = create(this.conn, table);
  return Table.finder(_id).execSync();
}

function findAllHasMany (_id, ref, callback) {
  var query = hasManyQuery.call(this, _id, ref);  
  query.exec(callback);
}

function findAllHasManySync (_id, ref) {
  // console.log(ref);
  var query = hasManyQuery.call(this, _id, ref);
  return query.execSync();
}

// return table.query();
function hasManyQuery (_id, ref) {
  var Reference = create(this.conn, ref.table);
  var query;
  var options = utils.clone(ref.options, ['filters', 'order', 'select', 'limit', 'skip']);
  
  options.filters = options.filters || {};
  options.filters[ref.on] = _id;
  
  query = Reference.query(options.filters);
  if (Array.isArray(options.order)) {
    query.order(options.order[0], options.order[1] || false);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.select) {
    query.select(options.select);
  }
  
  return query;
}

function resetIdsFile () {
  var ids = this.conn.readTableIdsDirSync(this.table);
  this.conn.resetIdsFile(this.table, ids);
}

function resetAllIndexFiles () {
  var self = this;
  this.schemas.forEachIndexField(function (name) {
    self.resetIndexFile(name);
  });
}

function resetIndexFile (name) {
  this.conn.resetIndexFile(this.table, name);
}

function refresh () {
  this.resetIdsFile();
  this.resetAllIndexFiles();
}