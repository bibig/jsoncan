exports.create = create;
exports.find   = find;
exports.findBy = findBy;

var async = require('async');
var libs  = require('./table_libs');
var Ref   = require('./table_reference');
var Query = require('./query');
var yi    = require('yi');


function find (_id) {
  return create.call(this, _id);
}

function findBy (name, value) {
  return create.call(this, name, value);
}

function create () {
  var parent = this;
  var fn, syncFn;
  var args;
  
  switch (arguments.length) {
    case 1:
      fn     = libs.find;
      syncFn = libs.findSync;
      args   = [arguments[0]];
      break;
    case 2:
      fn     = libs.findBy;
      syncFn = libs.findBySync;
      args   = [arguments[0], arguments[1]];
      break;
  }
  
  function exec (callback) {
    var self     = this;
    var thisArgs = yi.clone(args);
    var finderCb = function (e, record) {

      if (e) { callback(e); } else {
      
        if (Ref.hasReference.call(self)) {
          Ref.populateRecord.call(self, parent, record, function (e) {
            if (e) { callback(e); } else {
              callback(null, selectFilter.call(self, record));
            }
          });
        } else {
          callback(null, selectFilter.call(self, record));
        }
        
      }

    };
    
    thisArgs.push(finderCb);
    
    fn.apply(parent, thisArgs);
  }
  
  function execSync () {
    var record = syncFn.apply(parent, args);
    
    if (Ref.hasReference.call(this)) {
      Ref.populateRecordSync.apply(this, [parent, record]);
    }
    
    return selectFilter.call(this, record);
  }  

  function selectFilter (record) {
    var fields;
   
    if ( !record ) return record;
    
    fields = Query.parseSelectArguments.call(this, this.options.select);
    parent.schemas.convertBackEachField(record);
    // parent.schemas.addDefaultValues(record, fields);
    // console.log(fields);
    if (fields) {
      record = yi.clone(record, fields);
    }

    if (this.options.isFormat) {
      record = libs.format.call(parent, record);
    }
    
    return record;
    
  }
  
  function belongsTo (table, name) { 
    return Ref.belongsTo.apply(this, [parent, table, name]);
  }

  return {
    references: [],
    options: {
      select: null,
      isFormat: false
    },
    select: function () { return Ref.select.apply(this, arguments); },
    format: function () { return Ref.format.apply(this); },
    belongsTo: belongsTo,
    hasMany: function (table, options) { return Ref.hasMany.apply(this, [parent, table, options]); },
    ref: belongsTo, // alias
    exec: exec,
    execSync: execSync
  };
} // end of find