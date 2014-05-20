exports.create = create;
exports.find   = find;
exports.findBy = findBy;

var yi    = require('yi');
var async = require('async');

function find (_id) {
  return create.call(this, _id);
}

function findBy (name, value) {
  return create.call(this, name, value);
}

function create () {
  var parent = this;
  var Ref = parent.Ref;
  var Libs = parent.Libs;
  var fn, syncFn;
  var args;
  
  switch (arguments.length) {
    case 1:
      fn     = Libs.find;
      syncFn = Libs.findSync;
      args   = [arguments[0]];
      break;
    case 2:
      fn     = Libs.findBy;
      syncFn = Libs.findBySync;
      args   = [arguments[0], arguments[1]];
      break;
  }
  
  function exec (callback) {
    var self     = this;
    var thisArgs = yi.clone(args);
    
    function finderCb (e, record) {

      if (e) { callback(e); } else {
      
        async.series([
          function (callback) {
            var textFields;

            if ( ! self.options.readTextFields ) { return callback(); }

            textFields = parent.schemas.getTextFields(self.options.select);
            parent.conn.readTexts(parent.table, record, textFields, callback);
          },
          function (callback) {
            if (Ref.hasReference.call(self)) {
              Ref.populateRecord.call(self, parent, record, callback);
            } else {
              callback();
            }    
          }

        ], function (e) {
          if (e) { callback(e); } else {
            callback(null, selectFilter.call(self, record));
          }
        }); // end of async.series
        
      } // end of else

    } // end of finderCb
    
    thisArgs.push(finderCb);
    
    fn.apply(parent, thisArgs);
  }
  
  function execSync () {
    var record = syncFn.apply(parent, args);
    var textFields;

    if ( this.options.readTextFields ) { 
      textFields = parent.schemas.getTextFields(this.options.select);
      record = parent.conn.readTextsSync(parent.table, record, textFields);
    }

    if (Ref.hasReference.call(this)) {
      Ref.populateRecordSync.apply(this, [parent, record]);
    }
    
    return selectFilter.call(this, record);
  }  

  function parseSelectArguments () {
    var fields = [];

    if (arguments.length > 1) {

      for (var i = 0; i < arguments.length; i++) {
        fields.push(arguments[i]);
      }

    } else if (arguments.length == 1) {
      fields = arguments[0];
    } else {
      // return this.records;
      return null;
    }
    
    if (typeof fields == 'string') {
      fields = fields.replace(/[\s]/g, '');
      fields = fields.split(','); // 支持select('id, name, age');
    }
    
    return fields;
  }

  function selectFilter (record) {
    var fields;
   
    if ( !record ) return record;
    
    fields = parseSelectArguments(this.options.select);
    parent.schemas.convertBackEachField(record);
    // parent.schemas.addDefaultValues(record, fields);
    if (fields) {
      record = yi.clone(record, fields);
    }

    if (this.options.isFormat) {
      record = Libs.format.call(parent, record);
    }
    
    return record;
    
  }
  
  function belongsTo (table, name) { 
    return Ref.belongsTo.apply(this, [parent, table, name]);
  }

  return {
    options: {
      select   : null,
      isFormat : false,
      readTextFields: true
    },
    noReadTextFields: function () { this.options.readTextFields = false; return this;},
    references : [],
    select     : function () { return Ref.select.apply(this, arguments); },
    format     : function () { return Ref.format.apply(this); },
    belongsTo  : belongsTo,
    hasMany    : function (table, options) { return Ref.hasMany.apply(this, [parent, table, options]); },
    ref        : belongsTo, // alias
    exec       : exec,
    execSync   : execSync
  };
} // end of find