exports.find                   = find;
exports.findSync               = findSync;
exports.findBy                 = findBy;
exports.findBySync             = findBySync;
exports.findAll                = findAll;
exports.findAllSync            = findAllSync;
exports.present                = present;
exports.format                 = format;
exports.formatAll              = formatAll;
exports.makeInsertTasks        = makeInsertTasks;
exports.getIndexOrders         = getIndexOrders;
exports.getNoneIndexOrders     = getNoneIndexOrders;
exports.getIndexFilters        = getIndexFilters;
exports.getNoneIndexFilters    = getNoneIndexFilters;
exports.getConnQueryIndexKeys  = getConnQueryIndexKeys;
exports.getIdsFromIndexRecords = getIdsFromIndexRecords;
exports.makeConnQueryOptions   = makeConnQueryOptions;
exports.localQuery             = localQuery;
exports.arrayToMap             = arrayToMap;

var Xun   = require('xun');
var async = require('async');
var fs    = require('fs');
var yi    = require('yi');

function find (_id, callback) { 
  if (yi.isEmpty(_id)) { return callback(); }

  this.conn.read(this.table, _id, callback);
}

function findSync (_id) { 
  if (yi.isEmpty(_id)) { return null; }

  return this.conn.readSync(this.table, _id); 
}

function findBy (name, value, callback) {
  this.schemas.checkUniqueField(name);

  if (yi.isEmpty(name, value)) { return callback(); }

  this.conn.readBy(this.table, name, value, callback); 
}

function findBySync (name, value) {
  this.schemas.checkUniqueField(name);

  if (yi.isEmpty(name, value)) { return null; }

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
    list.push(format.call(self, record));
  });

  return list;
}

// be careful, the reference fields should not be filtered!
function format (record) {
  return yi.merge(this.schemas.presentAll(record), record);
}

// make insert tasks
function makeInsertTasks (datas) {
  var self  = this;
  var tasks = [];

  datas.forEach(function (data) {
    tasks.push(function (callback) {
      self.insert(data, callback);
    });
  });

  return tasks;
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
  
  if (! yi.isEmpty(indexOptions)) {
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
  
  if ( ! yi.isEmpty(noneIndexOptions) ) {
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
      var indexFilters    = getIndexFilters.call(self, options.filters);
      var indexFilterKeys = Object.keys(indexFilters);
      var indexOrders     = getIndexOrders.call(self, options.orders);
      var indexOrderKeys  = Object.keys(indexOrders);
      var usedIndexKeys   = yi.mergeArray(indexFilterKeys, indexOrderKeys);

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
  
  indexFilters    = getIndexFilters.call(this, options.filters);
  indexFilterKeys = Object.keys(indexFilters);
  indexOrders     = getIndexOrders.call(this, options.orders);
  indexOrderKeys  = Object.keys(indexOrders);
  usedIndexKeys   = yi.mergeArray(indexFilterKeys, indexOrderKeys);
  indexRecords    = this.conn.readAllIndexesSync(this.table, getConnQueryIndexKeys.call(this, usedIndexKeys));
  ids             = getIdsFromIndexRecords.call(this, indexRecords, options);
  records         = this.conn.queryAllSync(this.table, ids, makeConnQueryOptions.call(this, options));
  
  return localQuery.call(this, records, options);
}

function getConnQueryIndexKeys (usedIndexKeys) {
  var map  = {};
  var self = this;

  usedIndexKeys.forEach(function (name) {
    map[name] = self.schemas.fieldValueConvertFn(name);
  });

  return map;
}

function getIdsFromIndexRecords (records, options) {
  var indexFilters = getIndexFilters.call(this, options.filters);
  var indexOrders  = getIndexOrders.call(this, options.orders);
  var xun        = Xun.create(records).filter(indexFilters);
  // using index orders
  Object.keys(indexOrders).forEach(function (name) {
    xun.order(name, indexOrders[name]);
  });
  
  return xun.key('_id');
}

function makeConnQueryOptions (options) {
  var noneIndexFilters    = getNoneIndexFilters.call(this, options.filters);
  var noneIndexOrders     = getNoneIndexOrders.call(this, options.orders);
  var noneIndexOrdersKeys = Object.keys(noneIndexOrders);
  var newOptions          = { filters: noneIndexFilters };
  
  if (noneIndexOrdersKeys.length === 0) {
    newOptions.limit = options.limit;
    newOptions.skip  = options.skip;
  }
  
  return newOptions;
}

function localQuery (records, options) {
  var noneIndexOrders, noneIndexOrdersKeys;
  var self = this;
  var xun, fields;
  
  if ( ! Array.isArray(records) ) { return []; }

  if ( records.length === 0 ) { return []; }
  
  noneIndexOrders     = getNoneIndexOrders.call(this, options.orders);
  noneIndexOrdersKeys = Object.keys(noneIndexOrders);

  if (noneIndexOrdersKeys.length > 0) {
    xun = Xun.create(records);
    noneIndexOrdersKeys.forEach(function (name) {
      xun = xun.order(name, noneIndexOrders[name]);
    });
    
    if (options.skip) {
      xun = xun.skip(options.skip);
    }
    
    if (options.limit) {
      xun = xun.limit(options.limit);
    }
    
    records = xun.select();
  }
  
  if (options.select) {

    if (!xun) {
      xun = Xun.create(records);
    }
    records = xun.select(options.select);

  }
  
  if (xun) {
    fields = xun.fields;
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