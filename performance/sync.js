/**
 *
  test machine
    os x 10.9.2
    2.8 GHz Intel Core2 Duo
    4 GB 1067 MHz DDR3
    Macintosh HD
  
 ------------------------------------------ 
  1. inserted 500 records
   -> 3.782 ms/record
  2. finded 500 records
   -> 0.06 ms/record
  3. updated 500 records
   -> 0.644 ms/record
  4. removed 500 records
   -> 0.15 ms/record
  all time: 2327 ms 


  1. inserted 5000 records
   -> 10.475 ms/record
  2. finded 5000 records
   -> 0.054 ms/record
  3. updated 5000 records
   -> 1.413 ms/record
  4. removed 5000 records
   -> 3.203 ms/record
  all time: 75748 ms

 */

var util   = require('./util');
var rander = require('rander');
var max    = 100;
var Table;

util.run(function () {
  console.log('[SYNC profiling]');
  util.max = max;
  Table = util.createTable(true);
  insertAll();
  findAll();
  updateAll();
  removeAll();
  util.allTime();
  util.clear();
});

function insertAll () {
  var list = util.prepareData();
  var records;

  util.setTime();
  records = Table.insertAllSync(list);
  util.report('1. inserted %d records', records.length);
}

function findAll () {
  var records;

  util.setTime();
  records = Table.query().execSync();
  util.report('2. finded %d records', records.length);
}

function updateAll () {
  var records;

  util.setTime();
  records = Table.updateAllSync({id: ['<>', 0]}, {name: rander.string()});
  util.report('3. updated %d records', records.length);
}

function removeAll () {
  var records;
  
  util.setTime();
  records = Table.removeAllSync({id: ['<>', 0]});
  util.report('4. removed %d records', records.length);
}