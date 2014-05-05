exports.create = create;

var async = require('async');
var libs  = require('./table_libs');
var Ref   = require('./table_reference');

// new version of query
function create (filters) {
  var parent = this;
  
  function popluateRecords (records, callback) {
    var self = this;

    async.each(records, function (record, callback) {
      Ref.populateRecord.apply(self, [parent, record, callback]);
    }, callback);
  }
  
  function popluateRecordsSync (records, callback) {
    var self = this;

    records.forEach(function (record) {
      Ref.populateRecordSync.apply(self, [parent, record]);
    });
  }
  
  function exec (callback) {
    var self = this;

    libs.findAll.call(parent, self.options, function (e, records) {

      if (e) { callback(e); } else {

        if (self.options.isFormat) {
          records = libs.formatAll.call(parent, records);
        }
        
        if (Ref.hasReference.call(self)) {
          popluateRecords.call(self, records, function (e) {
            if (e) { callback(e); } else {
              if (self.options.isMap) {
                records = libs.arrayToMap(records);
              }
              // console.log('im here');
              callback(null, records);
            }
          });
        } else {
          if (self.options.isMap) {
            records = libs.arrayToMap(records);
          }
          callback(null, records);
        }

      }

    }); // end of _findAll
  }
  
  function execSync () {
    var records = libs.findAllSync.call(parent, this.options);
    
    if (this.options.isFormat) {
      records = libs.formatAll.call(parent, records);
    } 
    
    if (Ref.hasReference.call(this)) {
      popluateRecordsSync.call(this, records);
    }
    
    if (this.options.isMap) {
      records = libs.arrayToMap(records);
    }
    
    return records;
  }
  
  function count (callback) {
    parent.count(this.options.filters, callback);
  }
  
  function countSync () {
    return parent.countSync(this.options.filters);
  }

  function belongsTo (table, name) { 
    return Ref.belongsTo.apply(this, [parent, table, name]);
  }

  return {
    references: [],
    options: {
      filters  : filters || {}, 
      orders   : {},
      limit    : null,
      skip     : null,
      select   : null,
      isFormat : false,
      isMap    : false
    },
    where     : where,
    order     : order,
    limit     : limit,
    skip      : skip,
    select    : function () { return Ref.select.apply(this, arguments); },
    format    : function () { return Ref.format.apply(this); },
    map       : map,
    belongsTo : belongsTo,
    hasMany   : function (table, options) { return Ref.hasMany.apply(this, [parent, table, options]); },
    ref       : belongsTo, // alias
    exec      : exec,
    execSync  : execSync,
    count     : count,
    countSync : countSync
  };
} // end of create

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

function map () {
  this.options.isMap = true;
  
  return this;
}