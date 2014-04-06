exports.select = select;
exports.format = format;
exports.belongsTo = belongsTo;
exports.hasMany = hasMany;
exports.populateRecordSync = populateRecordSync;
exports.populateRecord = populateRecord;
exports.hasReference = hasReference;


var utils = require('./utils');
var async = require('async');
var pluralize = require('pluralize');

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
  return this;
}

function format () {
  this.options.isFormat = true;
  return this;
}

function belongsTo (parent, table, name) {
  var info = {};
  name = name || getReferenceName(table);
  parent.checkReference(table, name);
  info.type = 'belongsTo';
  info.table = table;
  info.on = name;
  // console.log(info);
  this.references.push(info);
  return this;
}

function getReferenceName (tableName) {
  return '_' + pluralize.singular(tableName);
}

function hasMany (parent, table, options) {
  var info;
  parent.checkTable(table);
  options = options || {};
  info = {
    type: 'hasMany',
    table: table,
    on: options.on ? options.on : getReferenceName(parent.table),
    options: options
  };
  
  this.references.push(info);
  return this;
}


function populateRecordSync (parent, record) {
  var self = this;
  
  this.references.forEach(function (ref) {
    var cache, _id;
    if (ref.type == 'hasMany') {
      record[ref.table] = parent.findAllHasManySync(record._id, ref);
    } else if (ref.type == 'belongsTo') {
      _id = record[ref.on];
      record[ref.on] = parent.findInOtherTableSync(_id, ref.table);
    } // end of else if
  }); // end of forEach
  
  return record;
} // end of function

function populateRecord (parent, record, callback) {
  var tasks = [];
  var self = this;

  this.references.forEach(function (ref) {
    switch (ref.type) {
      case 'hasMany':
        tasks.push(function (callback) {
          parent.findAllHasMany(record._id, ref, function (e, sons) {
            if (e) { callback(e); } else {
              record[ref.table] = sons;
              callback();
            }
          });
        });
        break;
      case 'belongsTo':
        tasks.push(function (callback) {
          var _id = record[ref.on];
          parent.findInOtherTable(_id, ref.table, function (e, father) {
            if (e) { callback(e); } else {
              record[ref.on] = father;
              callback();
            }
          });
        }); // end of push
        break;
    }
  }); // end of forEach
  
  async.waterfall(tasks, callback);
  
} // end of function

function hasReference () { 
  return utils.hasKeys(this.references); 
}