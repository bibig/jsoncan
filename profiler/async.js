/**
  test machine
    os x 10.9.2
    2.8 GHz Intel Core2 Duo
    4 GB 1067 MHz DDR3
    Macintosh HD
    
------------------------------------------
    
   No auto-increment field
    1. inserted 500 records
     -> 0.85 ms/record
    2. finded 500 records
     -> 0.168 ms/record
    3. updated 500 records
     -> 1.104 ms/record
    4. removed 500 records
     -> 0.138 ms/record
    all time: 1139 ms
      
    1. inserted 5000 records
     -> 4.674 ms/record
    2. finded 5000 records
     -> 0.117 ms/record
    3. updated 5000 records
     -> 0.994 ms/record
    4. removed 5000 records
     -> 0.633 ms/record
    all time: 32108 ms

------------------------------------------

  * Has auto-increment field
    1. inserted 500 records
     -> 2.358 ms/record
    2. finded 500 records
     -> 0.09 ms/record
    3. updated 500 records
     -> 0.736 ms/record
    4. removed 500 records
     -> 0.204 ms/record
    all time: 1703 ms
  
    1. inserted 5000 records
     -> 10.186 ms/record
    2. finded 5000 records
     -> 0.092 ms/record
    3. updated 5000 records
     -> 1.072 ms/record
    4. removed 5000 records
     -> 3.429 ms/record
    all time: 73913 ms
    
*/

var faker = require('faker');
var util = require('./util');
var max = 100;

var Table;

util.run(function () {
  console.log('[ASYNC profiling]');
  util.max = max;
  // Table = util.createTable(true);
  Table = util.createTable();
  insertAll();
});

function insertAll () {
  var list = util.prepareData();
  // console.log('ready to insertAll in async way');
  util.setTime();
  Table.insertAll(list, function (e, records) {
    if (e) {
      console.log(e);
    } else {
      util.report('1. inserted %d records', records.length);
      findAll();
    }
    
  });
}

function findAll () {
  // console.log('ready to findAll in async way');
  util.setTime();
  Table.findAll(function (e, records) {
    // console.log(records);
    util.report('2. finded %d records', records.length);
    updateAll();
  })
}


function updateAll () {
  // console.log('ready to updateAll in async way');
  util.setTime();
  Table.updateAll({id: ['<>', 0]}, {name: faker.Name.findName()}, function (e, records) {
    // console.log(records);
    util.report('3. updated %d records', records.length);
    removeAll();
  })
}

function removeAll () {
  // console.log('ready to removeAll in async way');
  util.setTime();
  Table.removeAll({id: ['<>', 0]}, function (e, records) {
    util.report('4. removed %d records', records.length);
    util.allTime();
    util.clear();
  });
}