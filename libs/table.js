exports.create = create;

var fs         = require('fs');
var async      = require('async');
var Schemas    = require('./schemas');
var Validator  = require('./validator');
var safepass   = require('safepass');
var yi         = require('yi');
var Libs       = require('./table_libs');
var Query      = require('./table_query');
var Model      = require('./table_model');
var Finder     = require('./table_finder');
var Ref        = require('./table_reference');
var Eventchain = require('eventchain');

var myna       = require('myna')({
  2000: 'Undefined table <%s>',
  2001: 'Duplicated value found <%s> in unique field <%s>.',
  2100: 'invalid data found, save failed!',
  2199: 'no data found, find by <%s=%s>'
});

/**
 * create table object
 *  
 * @conn: connection
 * @table: table name
 * @fields: schemas
 * @return Object
 */
function create (conn, table) {

  var schemas, validator;
  var tableSchemas = conn.tables[table];


  if ( ! tableSchemas ) {
    throw myna.speak(2000, table);
  }

  schemas   = Schemas.create(tableSchemas);
  validator = Validator.create(schemas, conn.validateMessages);
  // build table root path and unique fields paths
  conn.createTablePaths(table, schemas.getUniqueFields());
  
  schemas.getAutoIncrementValue = function (name) {
    return conn.readTableUniqueAutoIncrementFile(table, name);
  };
  
  return new Table(conn, table, schemas, validator);
}

var Table = function (conn, table, schemas, validator) {
  this.conn      = conn;
  this.table     = table;
  this.schemas   = schemas;
  this.validator = validator;
  this.find      = Finder.find;
  this.findBy    = Finder.findBy;
  this.finder    = Finder.create;
  this.findAll   = Query.create;
  this.query     = Query.create;
  this.model     = Model.create;
  this.create    = Model.create; // alias model
  
  // hook helpers
  this.Libs      = Libs;
  this.Ref       = Ref;
};

//-------------------myna.speak check functions-------------------

Table.prototype.checkTable = function (name) {

  if ( ! this.conn.tables[name]) {
    throw myna.speak(2000, name);
  }

};

Table.prototype.checkReference = function (table, name) {
  
  this.checkTable(table);
  this.schemas.checkField(name);

};


/**
 * 检查unique字段值的唯一性
 * @name: 字段名
 * @value: 值
 * @throw: 2001
 */
Table.prototype.checkUniqueFieldValue = function (name, value, isReturn) {
  var linkFile = this.conn.getTableUniqueFile(this.table, name, value);
  
  if (isReturn) {
    return ! fs.existsSync(linkFile);
  } else if (fs.existsSync(linkFile)) {
    throw myna.speak(2001, value, name);
  }
};

//-------------------end check functions-------------------

Table.prototype.getFields = function () { 
  return this.schemas.fields; 
};

Table.prototype.load = function (_id) {
  var data = this.finder(_id).execSync();

  if (!data) { return null; }

  return this.model(data);
};

Table.prototype.loadBy = function (name, value) {
  var data = this.finder(name, value).execSync();

  if (!data) { return null; }

  return this.model(data);
};

/**
 * 插入一条记录
 * 步骤：
 * 1. 对每个字段数据进行过滤
 * 2. 增加_id值
 * 3. 检查unique字段的合法性
 * @data: 记录数据
 * @callback(err, record)
 */
Table.prototype.insert = function (_data, callback) {
  
  var self = this;
  var data = this.schemas.filterData(_data); // filter data, make sure it is safe
  var afterInsert;
  
  // 补充default值, _id值
  data = this.schemas.addValues(data);
  this.save(data, function (e, record) {

    if (e) {
      callback(e);
    } else {
      afterInsert = Eventchain.create();
      self.bindLinkEachUniqueFieldEvents(afterInsert);
      self.bindUpdateAutoIncrementValuesEvents(afterInsert);
      self.bindAddIndexRecordsEvents(afterInsert);
      self.bindAddIdRecordEvent(afterInsert);
      self.bindIncrementCountersEvent(afterInsert);
      self.bindCustomTriggerEvent(afterInsert, 'afterInsert');

      afterInsert.emit(record, function (e) {
        callback(e, record);
      });
    }

  });

};

/**
 * sync way of insert
 */
Table.prototype.insertSync = function (data) {
  // filter data, make sure it is safe
  data = this.schemas.filterData(data);
  
  // 补充default值, _id值
  data = this.schemas.addValues(data);

  // 保存后的数据
  data = this.saveSync(data);
  
  // link files
  this.linkEachUniqueFieldSync(data);
  this.updateAutoIncrementValuesSync(data);
  
  // add all index records
  this.addIndexRecordsSync(data);
  this.addIdRecordSync(data);
  
  this.incrementCountersSync(data);

  this.pullCustomTriggerSync('afterInsert', data);
  
  return data;
};

Table.prototype.insertAll = function (datas, callback) {
  var tasks = Libs.makeInsertTasks.call(this, datas);
  
  if (this.schemas.hasAutoIncrementField()) {
    async.series(tasks, callback);  
  } else {
    async.parallelLimit(tasks, 100, callback);
    // async.series(tasks, callback);
  }

};

Table.prototype.insertAllSync = function (records) {
  var self = this;
  var results = [];
  
  records.forEach(function (record) {
    results.push(self.insertSync(record));
  });
  
  return results;
};


/** 
 * first: find record by _id
 * second: figure out which fields need to update
 * third: save the data
 * forth: handler after-save events
 * @callback(err, record)
 */

Table.prototype.update = function (_id, data, callback) {
  var self = this;
  
  this.find(_id).exec(function (e, record) {

    if (e) {
      callback(e);
    } else if (!record) {
      callback(myna.speak(2199, '_id', _id));
    } else {
      self.updateRecord(record, data, callback);
    }

  }); // end of find
  
};

Table.prototype.updateBy = function (field, value, data, callback) {
  var self = this;
  
  this.findBy(field, value).exec(function (err, record) {

    if (err) {
      callback(err);
    } else if (!record) {
      callback(myna.speak(2199, field, value));
    } else {
      self.updateRecord(record, data, callback);
    }

  });

};


Table.prototype.updateRecord = function (record, data, callback) {
  var self          = this;
  var changedFields = this.schemas.getChangedFields(data, record);
  var afterUpdate;
      
  if (changedFields.length === 0 ) { // 数据没有更改
    return callback(null, record);
  }
  
  data = this.schemas.getRealUpdateData(data, record);
  
  // save data.
  this.save(data, function (e, updatedRecord) {
    
    if (e) {
      callback(e);
    } else {
      // create temporary event to handler after-update events
      afterUpdate = Eventchain.create();
      
      self.bindCustomTriggerEvent(afterUpdate, 'afterUpdate');

      // handler old record which replaced by updated data
      afterUpdate.add(function (args, next) {
        var record         = args[0];
        var updatedRecord  = args[1];
        var changedFields  = args[2];
        var oldDataHandler = Eventchain.create(); // Inception, event in event
        
        self.bindUnlinkEachUniqueFieldEvents(oldDataHandler, changedFields);
        self.bindRemoveIndexRecordsEvents(oldDataHandler, changedFields);
        
        if (self.schemas.hasCounter(changedFields)) {
          self.bindDecrementCountersEvent(oldDataHandler, changedFields);
        }
        
        oldDataHandler.emit(record, function (e) {
          next(e, [updatedRecord, changedFields]);
        });
      }); // end of add
      
      // handler new updated record
      afterUpdate.add(function (args, next) {
        var updatedRecord  = args[0];
        var changedFields  = args[1];
        var newDataHandler = Eventchain.create();
        
        self.bindLinkEachUniqueFieldEvents(newDataHandler, changedFields);
        self.bindAddIndexRecordsEvents(newDataHandler, changedFields);
        
        if (self.schemas.hasCounter(changedFields)) {
          self.bindIncrementCountersEvent(newDataHandler, changedFields);
        }
        
        newDataHandler.emit(updatedRecord, function (e) {
          next(e, updatedRecord);
        });
      }); // end of add

      afterUpdate.emit([record, updatedRecord, changedFields], callback);
    }

  }, changedFields); // end of save

};

/** 
 * updateRecord sync way
 */ 
Table.prototype.updateRecordSync = function (record, _data) {
  var data          = this.schemas.filterData(_data);
  var changedFields = this.schemas.getChangedFields(data, record);
  var safe;
  
  if (changedFields.length === 0 ) { // 数据没有更改,
    return record;
  }
  
  this.unlinkEachUniqueFieldSync(record, changedFields);
  
  if (this.schemas.hasCounter(changedFields)) {
    this.decrementCountersSync(record, changedFields);
  }
  
  try{
    safe = this.saveSync(this.schemas.getRealUpdateData(data, record), changedFields);
  } catch (e) {
  
    if (this.schemas.hasCounter(changedFields)) {
      this.incrementCountersSync(record, changedFields);
    }

    this.linkEachUniqueFieldSync(record, changedFields);

    throw e;
  }
  
  this.linkEachUniqueFieldSync(safe, changedFields);
  this.removeIndexRecordsSync(record, changedFields);
  this.addIndexRecordsSync(safe, changedFields);
  
  if (this.schemas.hasCounter(changedFields)) {
    this.incrementCountersSync(safe, changedFields);
  }

  this.pullCustomTriggerSync('afterUpdate', [record, safe, changedFields]);

  return safe;
};


/** 
 * update sync version
 */ 
Table.prototype.updateSync = function (_id, data) {
  var record = this.find(_id).execSync();

  return this.updateRecordSync(record, data);
};

/** 
 * updateBy sync version
 */ 
Table.prototype.updateBySync = function (field, value, data) {
  var record = this.findBy(field, value).execSync();
  
  if (!record) {
    throw myna.speak(2199, field, value);
  }

  return this.updateRecordSync(record, data);
};

Table.prototype.updateAll = function (options, data, callback) {
  var self = this;
  
  function _makeUpdateTasks (records) {
    var tasks = [];
    
    records.forEach(function (record) {
      tasks.push(function (callback) {
        self.updateRecord(record, data, callback);
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
        // async.series(tasks, callback);
      } else {
        callback(null);
      }

    }
    
  });

};

Table.prototype.updateAllSync = function (options, data) {
  var self    = this;
  var results = [];
  var records = this.query(options).execSync();

  records.forEach(function (record) {
    results.push(self.updateRecordSync(record, data));
  });

  return results;
};

/** 
 * 物理删除一条记录
 * 如果有unique字段，需要挨个清除掉unique字段的link文件
 * @_id: primary id
 * @callback(err)
 */

Table.prototype.remove = function (_id, callback) { 
  var self = this;

  this.finder(_id).exec(function (err, record) {

    if (err) {
      callback(err);
    } else {
      self.removeRecord(record, callback);
    }

  });

};

Table.prototype.removeBy = function (field, value, callback) {
  var self = this;
  
  this.finder(field, value).exec(function (err, record) {
  
    if (err) {
      callback(err);
    } else {
      self.removeRecord(record, callback);
    }

  });

};

Table.prototype.removeRecord = function (record, callback) {
  var self = this;
  var afterRemove;
  // no data found
  if (!record) {
    callback();
  } else {

    this.conn.remove(this.table, record._id, function (e) {

      if (e) {
        callback(e);
      } else {
        afterRemove = Eventchain.create();
        self.bindUnlinkEachUniqueFieldEvents(afterRemove);
        self.bindRemoveIndexRecordsEvents(afterRemove);
        self.bindRemoveIdRecordEvent(afterRemove);
        self.bindDecrementCountersEvent(afterRemove);
        self.bindCustomTriggerEvent(afterRemove, 'afterRemove');

        afterRemove.emit(record, function (e) {
          callback(e, record);
        });
      }

    });

  }

};

Table.prototype.removeRecordSync = function (record) {
  
  if (!record) return;

  this.conn.removeSync(this.table, record._id);
  this.unlinkEachUniqueFieldSync(record);
  this.removeIndexRecordsSync(record);
  this.removeIdRecordSync(record);
  this.decrementCountersSync(record);
  this.pullCustomTriggerSync('afterRemove', record);
};

Table.prototype.removeSync = function (_id) {
  var record = this.finder(_id).execSync();

  this.removeRecordSync(record);

  return record;
};

Table.prototype.removeBySync = function (field, value, callback) {
  var record = this.finder(field, value).execSync();
  
  this.removeRecordSync(record);

  return record;
};

Table.prototype.removeAll = function (options, callback) {
  var self = this;
  
  function _makeRemoveTasks (records) {
    var tasks = [];
    
    records.forEach(function (record) {
      tasks.push(function (callback) {
        self.removeRecord(record, callback);
      });
    });
    
    return tasks;
  }
  
  this.query(options).exec(function (err, records) {

    if (err) {
      callback(err);
    } else {
    
      if (records.length > 0) {
        // async.parallelLimit(_makeRemoveTasks(records), 150, callback);
        async.series(_makeRemoveTasks(records), callback);
      } else {
        callback(null);
      }

    }

  });
  
};

Table.prototype.removeAllSync = function (options, callback) {
  var self = this;
  var records = this.query(options).select().execSync();

  records.forEach(function (record) {
    self.removeRecordSync(record);
  });

  return records;
};

Table.prototype.checkFields = function (names) {
  var self = this;

  if ( ! Array.isArray(names)) {

    if (typeof names == 'object') {
      names = Object.keys(names);
    } else {
      names = [];
    }

  }
  
  names.forEach(function (name) {
    self.schemas.checkField(name);
  });

};


Table.prototype.validate = function (data, changedFields) {
  var self = this;

  this.validator.isUnique = function (name, field, value) {
    return self.checkUniqueFieldValue(name, value, true);
  };
  
  return this.validator.check(data, changedFields);
};

/**
 * 保存数据
 * @data: 要保存的数据
 * @callback(err, data or invalid messages)
 *  myna.speak 2100 表示数据校验失败
 */
Table.prototype.save = function (data, callback, changedFields) {
  var e;
  var check = this.validate(data, changedFields);
  
  if (check.isValid()) {
    data = this.schemas.clearFakeFields(data);
    // 对需要转换的数据进行转换
    data = this.schemas.convertEachField(data, changedFields);
    this.conn.save(this.table, data._id, data, callback);
  } else {
    e = myna.speak(2100); 
    e.invalidMessages = check.getMessages();
    e.invalid = true;
    callback(e);
  }

};

/**
 * 同步保存数据
 * @data: 要保存的数据
 * @throw myna.speak 2100 表示数据校验失败
 */
Table.prototype.saveSync = function (data, changedFields) {
  var check = this.validate(data, changedFields);
  
  if (check.isValid()) {
    data = this.schemas.clearFakeFields(data);
    data = this.schemas.convertEachField(data, changedFields);
    return this.conn.saveSync(this.table, data._id, data); 
  } else {
    e = myna.speak(2100); 
    e.invalidMessages = check.getMessages();
    e.invalid = true;
    // console.myna.speak(e);
    throw e;
  }

};

Table.prototype.count = function (filters, callback) {
  var self = this;

  this.checkFields(filters);
  
  async.waterfall([
    function (callback) {
      var indexFilters = Libs.getIndexFilters.call(self, filters);
      var indexFilterKeys = Object.keys(indexFilters);

      self.conn.readAllIndexes(self.table, Libs.getConnQueryIndexKeys.call(self, indexFilterKeys), function (e, records) {
        var ids;

        if (e) {
          callback(e);
        } else {
          ids = Libs.getIdsFromIndexRecords.call(self, records, { filters: indexFilters });
          callback(null, ids);
        }

      });
    },
    function (ids, callback) {
      var noneIndexFilters    = Libs.getNoneIndexFilters.call(self, filters);
      var noneIndexFilterKeys = Object.keys(noneIndexFilters);

      if (noneIndexFilterKeys.length > 0) {
        self.conn.queryAll(self.table, ids, Libs.makeConnQueryOptions.call(self, { filters: noneIndexFilters }), function (e, records) {
          callback(null, records.length);
        });
      } else {
        callback(null, ids.length);
      }

    }
  ], callback);
};

Table.prototype.countSync = function (filters) {
  var indexFilters, indexFilterKeys, noneIndexFilters, noneIndexFilterKeys, ids, records;

  this.checkFields(filters);
  
  indexFilters        = Libs.getIndexFilters.call(this, filters);
  indexFilterKeys     = Object.keys(indexFilters);
  noneIndexFilters    = Libs.getNoneIndexFilters.call(this, filters);
  noneIndexFilterKeys = Object.keys(noneIndexFilters);
  records             = this.conn.readAllIndexesSync(this.table, Libs.getConnQueryIndexKeys.call(this, indexFilterKeys));
  ids                 = Libs.getIdsFromIndexRecords.call(this, records, { filters: indexFilters });
  
  if (noneIndexFilterKeys.length === 0) {
    return ids.length;  
  } else {
    return this.conn.queryAllSync(this.table, ids, Libs.makeConnQueryOptions.call(this, { filters: noneIndexFilters })).length;
  }

};

Table.prototype.findAllBelongsTo = function (ref, callback) {
  var Reference = create(this.conn, ref.table);
  var filters   = ref.filters || {};
  var fields    = yi.clone(ref.select);
  var order     = ref.order;
  var query     = Reference.query(filters).map();
  
  if (fields) {

    if (typeof fields === 'string') {
      fields = fields.split(',');
    }

    if (Array.isArray(fields)) {
      fields.unshift('_id');
      query = query.select(fields);
    }

  }
  
  if (Array.isArray(order)) {
    query = query.order(order[0], order[1]);
  }
  
  if (callback) {
    query.exec(callback);
  } else {
    return query.execSync();
  }

};

Table.prototype.findAllBelongsToSync = function (ref) {
  return this.findAllBelongsTo(ref);
};

Table.prototype.findInOtherTable = function (_id, table, callback) {
  var Table = create(this.conn, table);

  Table.finder(_id).exec(callback);
};

Table.prototype.findInOtherTableSync = function (_id, table) {
  var Table = create(this.conn, table);

  return Table.finder(_id).execSync();
};

Table.prototype.findAllHasMany = function (_id, ref, callback) {
  var query = this.hasManyQuery(_id, ref);

  query.exec(callback);
};

Table.prototype.findAllHasManySync = function (_id, ref) {
  var query = this.hasManyQuery(_id, ref);

  return query.execSync();
};

// return table.query();
Table.prototype.hasManyQuery = function (_id, ref) {
  var Reference = create(this.conn, ref.table);
  var options   = yi.clone(ref.options, ['filters', 'order', 'select', 'limit', 'skip']);
  var query;
  
  options.filters         = options.filters || {};
  options.filters[ref.on] = _id;
  query                   = Reference.query(options.filters);

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
};

Table.prototype.increment = function (_id, name, callback, step) {
  var self = this;

  step = step || 1;
  // console.log(arguments);
  this.find(_id).exec(function (e, record) {
    var data = {};

    if (e) { callback(e); } else {

      if ( ! record ) { 
        callback(); 
      } else {
        // console.log(record);
        data[name] = record[name] + step;
        self.updateRecord(record, data, callback);
      }

    }

  });

};

Table.prototype.decrement = function (_id, name, callback, step) {
  var self = this;

  step = step || 1;
  
  this.find(_id).exec(function (e, record) {
    var data = {};

    if (e) { callback(e); } else {
      if ( ! record ) { 
        callback(); 
      } else {
        data[name] = record[name] - step;
        self.updateRecord(record, data, callback);
      }
    }

  });

};

Table.prototype.incrementSync = function (_id, name, step) {
  var record = this.find(_id).execSync();
  var data   = {};

  if ( ! record ) { return null;}

  step = step || 1;
  data[name] = record[name] + step;

  return this.updateRecordSync(record, data);
};

Table.prototype.decrementSync = function (_id, name, step) {
  var record = this.find(_id).execSync();
  var data   = {};

  if ( ! record ) { return null;}

  step = step || 1;
  data[name] = record[name] - step;

  return this.updateRecordSync(record, data);
};

//----------------------------EVENTS---------------------------------------------

/**
 * register create symbol link event for each unique field.
 * @event: an instance of Eventchain
 */
Table.prototype.bindLinkEachUniqueFieldEvents = function (event, targetFields) {
  var self = this;

  this.schemas.forEachUniqueField(function (name, field) {
    event.add(function (record, next) {
      var _id   = record._id;
      var value = record[name];

      self.conn.linkTableUniqueFile(self.table, _id, name, value, function (e) {
        next(e);
      });
    });
  }, targetFields);

};

/**
 * register remove symbol link event for each unique field.
 * @event: an instance of Eventchain
 * @targetFields
 */
Table.prototype.bindUnlinkEachUniqueFieldEvents = function (event, targetFields) {
  var self = this;
  
  this.schemas.forEachUniqueField(function (name, field) {
    event.add(function (record, next) {
      self.conn.unlinkTableUniqueFile(self.table, name, record[name], function (e) {
        next(e);
      });
    });
  }, targetFields);

};

/**
 * update autoincrement values for table if they exist
 * @event: an instance of Eventchain
 */
 
Table.prototype.bindUpdateAutoIncrementValuesEvents = function (event) {
  var self = this;

  this.schemas.forEachUniqueField(function (name, field, schemas) {
    var nextValue;

    if (schemas.isAutoIncrement(field)) {
      event.add(function (record, next) {
        var nextValue = schemas.getNextAutoIncrementValue(name, record[name]);
        
        self.conn.writeTableUniqueAutoIncrementFile(self.table, name, nextValue, function (e) {
          next(e);
        });
      });
    }
  });
};

/**
 * appending newly added index info into index file of table
 * @event: an instance of Eventchain
 */
 
Table.prototype.bindAddIndexRecordsEvents = function (event, targetFields) {
  var self = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    event.add(function (record, next) {
      var _id   = record._id;
      var value = record[name];

      self.conn.addIndexRecord(self.table, name, value, _id, function (e) {
        next(e);
      });
    });
  }, targetFields);

};

/**
 * appending newly removed index info into index file of table
 * @event: an instance of Eventchain
 */

Table.prototype.bindRemoveIndexRecordsEvents = function (event, targetFields) {
  var self = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    event.add(function (record, next) {
      var _id   = record._id;
      var value = record[name];

      self.conn.removeIndexRecord(self.table, name, value, _id, function (e) {
        next(e);
      });
    });
  }, targetFields);

};

/**
 * appending newly added _id info into primary index file of table
 * @event: an instance of Eventchain
 */
 
Table.prototype.bindAddIdRecordEvent = function (event) {
  var self = this;
  
  event.add(function (record, next) {
    self.conn.addIdRecord(self.table, record._id, function (e) {
      next(e);
    });  
  });
};

Table.prototype.bindRemoveIdRecordEvent = function (event) {
  var self = this;

  event.add(function (record, next) {
    self.conn.removeIdRecord(self.table, record._id, function (e) {
      next(e);
    });
  });
};


Table.prototype.bindUpdateCountersEvent = function (event, step, fields) {
  var self = this;
  var counters;

  if ( ! this.schemas.hasCounter() ) { return; }

  counters = this.schemas.getCounters();
  event.add(function (record, next) {
    var updateEvent = Eventchain.create();

    counters.forEach(function (info) {
      var name = info[0];
      var counterName = info[1];
      
      if (Array.isArray(fields)) {
        if (fields.indexOf(name) == -1) { return; }
      }
      
      updateEvent.add(function (record, next) {
        var referenceTableName =  Ref.getReferenceTable(name);
        var referenceTable     = create(self.conn, referenceTableName);
        var fn                 = step > 0 ? referenceTable.increment : referenceTable.decrement;

        fn.call(referenceTable, record[name], counterName, function (e, record) {
          next(e, record);
        }, Math.abs(step));
      });
    }); // counter foreach over

    updateEvent.emit(record, next);
  });

};

Table.prototype.bindIncrementCountersEvent = function (event, fields) {
  this.bindUpdateCountersEvent(event, 1, fields);
};

Table.prototype.bindDecrementCountersEvent = function (event, fields) {
  this.bindUpdateCountersEvent(event, -1, fields);
};

/**
 * [bindCustomTriggerEvent]
 * bind custom trigger event defined in schemas. 
 * support: afterInsert, afterUpdate, afterRemove
 * 
 * @author bibig@me.com
 * @update [2014-05-16 12:03:04]
 * @param  {object} eventchain [the instance of eventchain]
 * @param  {string} name       [event name]
 * @return {void}
 */
Table.prototype.bindCustomTriggerEvent = function (eventchain, name) {
  var self = this;
  var customFn = this.schemas.getEvent(name);

  if ( ! customFn ) { return; }

  eventchain.add(function (args, next) {
    customFn(args);
    next();
  });

};


// ----------------------SYNC EVENTS---------------------------------

/**
 * 为每一个unique字段创建一个symbol link文件，指向以本record的id文件
 * 前提：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @fields: 特别指定的字段范围
 */
Table.prototype.linkEachUniqueFieldSync = function (record, targetFields) {
  var self = this;

  this.schemas.forEachUniqueField(function (name, field) {
    self.conn.linkTableUniqueFileSync(self.table, record._id, name, record[name]);
  }, targetFields);
};

/**
 * 删除每一个unique字段的symbol link文件
 * 调用此方法的前提是：已经保证unique值是唯一的
 * @record: 准备保存到数据库的记录
 * @targetFields: 特别指定的字段范围
 */
Table.prototype.unlinkEachUniqueFieldSync = function (record, targetFields) {
  var self = this;

  this.schemas.forEachUniqueField(function (name, field) {
    self.conn.unlinkTableUniqueFileSync(self.table, name, record[name]);
  }, targetFields);
};

Table.prototype.updateAutoIncrementValuesSync = function (data) {
  var self = this;

  this.schemas.forEachUniqueField(function (name, field, schemas) {
    var nextValue;
    if (schemas.isAutoIncrement(field)) {
      nextValue = schemas.getNextAutoIncrementValue(name, data[name]);
      self.conn.writeTableUniqueAutoIncrementFileSync(self.table, name, nextValue);
    }
  });
};

Table.prototype.addIndexRecordsSync = function (data, targetFields) {
  var self = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    self.conn.addIndexRecordSync(self.table, name, data[name], data._id);
  }, targetFields);
};

Table.prototype.removeIndexRecordsSync = function (data, targetFields) {
  var self = this;
  
  this.schemas.forEachIndexField(function (name, field) {
    self.conn.removeIndexRecordSync(self.table, name, data[name], data._id);
  }, targetFields);
};

Table.prototype.addIdRecordSync = function (record) {
  this.conn.addIdRecordSync(this.table, record._id);
};

Table.prototype.removeIdRecordSync = function (record) {
  this.conn.removeIdRecordSync(this.table, record._id);
};

Table.prototype.updateCountersSync = function (record, step, fields) {
  var self = this;
  var counters;

  if ( ! this.schemas.hasCounter() ) { return; }
  
  counters = this.schemas.getCounters();

  counters.forEach(function (info) {
    var name = info[0];
    var counterName, referenceTableName, referenceTable, fn;
    
    if (Array.isArray(fields)) {
      if (fields.indexOf(name) == -1) { return; }
    }
    
    counterName        = info[1];
    referenceTableName =  Ref.getReferenceTable(name);
    referenceTable     = create(self.conn, referenceTableName);
    fn                 = step > 0 ? referenceTable.incrementSync : referenceTable.decrementSync;
    fn.call(referenceTable, record[name], counterName, Math.abs(step));
  }); // counter foreach over

};

Table.prototype.incrementCountersSync = function (record, fields) {
  this.updateCountersSync(record, 1, fields);
};

Table.prototype.decrementCountersSync = function (record, fields) {
  this.updateCountersSync(record, -1, fields);
};

Table.prototype.pullCustomTriggerSync = function (name, args) {
  var self = this;
  var customFn = this.schemas.getEvent(name);

  if ( ! customFn ) { return; }
  customFn(args);
};

// ----------------------------------------------------------------
Table.prototype.resetIdsFile = function () {
  var ids = this.conn.readTableIdsDirSync(this.table);

  this.conn.resetIdsFile(this.table, ids);
};

Table.prototype.resetAllIndexFiles = function () {
  var self = this;
  
  this.schemas.forEachIndexField(function (name) {
    self.resetIndexFile(name);
  });
};

Table.prototype.resetIndexFile = function (name) {
  this.conn.resetIndexFile(this.table, name);
};

Table.prototype.refresh = function () {
  this.resetIdsFile();
  this.resetAllIndexFiles();
};