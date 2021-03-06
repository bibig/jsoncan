# Jsoncan

+ An agile json based database.
+ load seamlessly with zero config.
+ if you are developing a project like static site, personal blog or business website, jsoncan will be quite useful.
+ all the data is saved in json files, it's like a cache system, and it works the way.
+ using in the right place, it will be convenient, fast and effective.


## Install
 npm install jsoncan

## Version
  1.1.1

## Usage  

### create and connection
```javascript
  
  var Jsoncan = require('jsoncan');
  
  // db root, the json files will save here, make sure the path does exist. if not, jsoncan will try to create it.
  var PATH = path.join(__dirname, 'data'); 
  
  // define tables schemas
  var tables = {
    people: {
      id: {
        text: 'user id',
        type: 'autoIncrement'
      },
       name: {
        text: 'your name',
        type: 'string',
        max: 30,
        min: 2,
        required: true
      }
    }
  };
  
  // create a new db, if exists, connect it.
  var can = new Jsoncan(PATH, tables);
        
  // create or open a table.
  var People = can.open('people'); // can.table('people') do the same thing.
  
  // create table with schemas.
  var Doctor = can.open('doctor', schemas);
  
```

### primary key

+ All the tables will be automatically added an "_id" field as the only primary key.
+ You need not to define _id field in table schemas.
+ You can add multiply unique keys, which are similar to primary key.

### insert
when a record inserted, a new "_id" value will be assigned to it.

```javascript
  
  var Tom;
  
  People.insert({name: 'Tom'}, function (e, record) {
    Tom = record; 
    console.log(record); // now, record have a "_id" key
  });
  
  // insert multiply records at one time.
  People.insertAll([{name: 'David'}, {name: 'Bill'}], function (e, records) {
    console.log(records);
  });
```

### finder

+ using finder to retrieve one record, when no data found, they will return null value.
+ finder(_id)  find by primary key.
+ finder(uniqueName, value)  find by unique key.
+ find(_id) and findBy(uniqueName, value) are aliases.

```javascript

  // find by primary id
  People.finder(Tom._id).exec(function (e, record) {...});
  // or 
  People.find(Tom._id).exec(function (e, record) {...});
  
  // sync way
  var man = People.find(_id).execSync();
  
  // find by unique id, only used for the uniqued fields.
  People.finder('id', Tom.id).exec(function (e, record) {...});
  // or 
  People.findBy('id', Tom.id).exec(function (e, record) {...});
  // sync way
  var otherMan = People.findBy('name', 'xxx').execSync();
```

### query or findAll
using query() to retrieve multiply records. findAll() is alias. 

```javascript

  // query(filters).exec(callback);
  Product.query({price: ['>', 100], name: ['like', '%haha%']}).exec(function (e, records) {...} );
  // or
  Product.findAll(filters).exec(callback);
  // using where()
  Product.query()
    .where('price', '>', 100)
    .where('name', 'like', '%haha%')
    .exec(callback);
  
  // sync way
  var men = People.query({age: ['between', 18, 36]}).execSync();
  
  // chain skip, limit and select
  People.query().where(age, ['>=', 18]).order('name').skip(100).limit(10).select('id, name').exec(callback);
  
  // where
  // support operators: =, >, <=, <>, !=, in, not in,  between, like, pattern.
  var query = People.query();
  query.where('age', 8).select();
  query.where('age', '>', 8).select();
  query.where('text', 'like', '%hello%').select();
  query.where('name', 'pattern', /^Liu/i).select();
  query.where('name', 'in', ['Tom', 'Mike', 'Jobs']).select();
  // you can chain them.
  query.where('age', '>', 8).where('name', 'Tom').select();
  // or use a hash
  query.where({age: ['>', 8], name: 'Tom'}).select();
  
  
  
  // select ways
  query.select() // select all
  query.select('id', 'name');
  query.select(['id', 'name']);
  query.select('id, name');
  
  // order ways
  // default is ascend
  query.order(age);
  // in descend
  query.order(age, true);
  
  // skip and limit
  query.order('id').skip(3).limit(10);
  
  // exec
  query.exec(function (e, records) { ... });
  // exec in sync
  var records = query.execSync();
  
  // count
  query.count(function (e, count) {...});
  // count in sync
  var count = query.countSync();
  
```

### update

```javascript

  // update by primary field
  Product.update(product._id, {price: 199.99}, function (e, record) {...});
  
  // update by unique field
  User.updateBy('email', user.email, {age: 22}, function (e, record) {...});
  
  // update all
  User.updateAll({age: 17}, {class: 'xxx'}, function (e, records) {...});
  
  // sync way
  Product.updateSync(product._id, {price: 199.99});
  User.updateBySync('email', user.email, {age: 22});
  User.updateAllSync({age: 17}, {class: 'xxx'});
  
```

### remove
```javascript

  // delete one record
  User.remove(_id, function (e) {...});
  User.removeBy('class', 'xxx', function (e) {...});
  // delete mutilple records
  User.removeAll({age, 10}, function (e) {...});
  // sync way
  User.removeSync(_id);
  User.removeBySync('class', 'xxx');
  User.removeAllSync({age, 10});
    
```

### the model way
There are three ways to create a model object: 

+ var model = Table.create({/*data*/});
+ var model = Table.load(_id);
+ var model = Table.loadBy(uniqueName, value);

```javascript

  var Product = can.open('product');
  
  // create a new one
  var productA = Product.create({name: 'xxx'}); // or Product.model({...});
  productA.set(price, 2.99);
  product.save(function (e, records) {...});
  
  // load exist record from db 
  // load by primary id
  var productB = Product.load('the_primary_id');
  // load by unique field
  var productC = product.loadBy(an_unique_name, 'xxxx');
  
  // use chain
  productA.set(name, 'xxx').save(callback);
  
  // remove
  productA.remove(callback);
  
  // sync way
  productA.set(price, 2.99).saveSync();
  productA.set({name: 'xxx', price: 2.99}).saveSync();
  productA.removeSync();
  
```

### validate
For data safe, jsoncan will always validate the data automatically before save the data into the json file.
all the validate rules are defined in field schemas object.
the validate part is based on [validator.js][validator.js]

so far, you can add these rules.

+ isUnique
+ isNull
+ isRequired
+ required // alias isRequired
+ shouldAfter [date string]
+ shouldBefore [date string]
+ length
+ size // alias length
+ max // max size
+ min // min size
+ maxValue
+ minValue
+ pattern [regex object]

in insert or update process, if validate failed, it will throw an error.

```javascript
  
  // suppose name is an unique field in product
  var productA = Product.loadBy('name', 'xxx');
  productA.set('name', 'a duplicated value').save(function (e, record) {
    
    console.log(e);
    // will output
    /*
      {
      [Error: invalid data found, save failed!]
       code: 1300,
         invalidMessages: { name: 'Duplicated value found, <xxx> already exists'},
         invalid: true
        }
    */
    // so you can use e.invalid to judge whether the error throw by validate.
    // and you can get the error messages by e.invalidMessages.
    
  });

```

you can also validate data in model way

```javascript

  var productA = Product.model({name: 'xxx', price: xxx, label: xxx});
  productA.validate(); // return boolean
  product.isValid // after validate, isValid will be set true or false
  // if failed, messages will be set as a hash object.
  validateMessages = productA.messages;  

```

### schemas

the table schemas defined in a normal hash object.
except the above validate rule keys, a schema also support these keys:

+ text
+ type
+ default
+ format   // define a function which format a value for presentation. 
+ logic  // define a function to create a runtime value by other fields value.
+ decimals // used for float type.
+ values // used for enum or map fields.
+ suffix  // used for presentation
+ prefix  // used for presentation
+ validate // a custom validate function, when failed return message or return null.
+ isFake  // for field like 'passwordConfirm', it 's basically same as normal field, except it will never be saved!
+ autoIncrement // the first number for autoIncrement field, default is 1
+ step    // for autoIncrement, default is 1
+ isIndex // index field

field types including:
+ 'string'
+ 'int'
+ 'float'
+ 'boolean'
+ 'map'
+ 'hash' // map alias
+ 'ref'  // new added,  reference field
+ 'enum'
+ 'date'
+ 'datetime'
+ 'timestamp'
+ 'autoIncrement'
+ 'password' // will hash password automatically, and you can use Table.isValidPassword(inputedPassword) to check. see [safepass][safepass].
+ 'created' // will set a current timestamp value when record created.
+ 'modified' // will be always updated to current timestamp when record saved.
+ 'text',
+ 'primary' // only for _id field
+ 'random' // alpha number random, default length 8
+ 'alias' // a logic field, used with "logic" key.
+ 'email'
+ 'password'
+ 'url'
+ 'uuid'
+ 'alpha'
+ 'numeric'
+ 'alphanumeric'
+ 'ip' // same as ip4
+ 'ip4'
+ 'ip6'
+ 'creditCard'
+ 'credit card' // same as creditCard
+ 'object' // array, hash, function, up to you

examples:

```javascript

  var schemas = {
    id: {
      text: 'user id',
      type: 'random',
      isUnique: true,
      size: 10
    },
    firstName: {
      text: 'first name',
      type: 'string',
      max: 50,
      min: 2,
      required: true,
    },
    lastName: {
      type: 'alias',
      logic: function (data) {
        return [data.firstName, data.lastName].join('.');
      }
    },
    password: {
      type: 'password',
      size: 30,
      required: true
    },
    passwordConfirm: {
      type: 'string',
      size: 30,
      isFake: true,
      validate: function (value, data) {
        if (value == undefined || value == '' || value == null) {
          return 'please input password confirmation';
        } else if (value != data.password) {
          return 'twice inputed passwords are not same!';
        }
      }
      
    },
    country: {
      text: 'country',
      type: 'map',
      requred: true,
      values: {
        'cn': 'China',
        'uk': 'England',
        'jp': 'Japan',
        'us': 'USA'
      }
    },
    age: {
      text: 'age',
      type: 'int',
      default: 10
    },
    sex: {
      text: 'status',
      type: 'enum',
      values: ['female', 'male']
    },
    balance: {
      text: 'cash balance',
      type: 'float',
      default: 0.00,
      prefix: '$'
    },
    created: {
      type: 'created',
      format: function (t) {
        var d = new Date(t);
        return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-') + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].join(':');
      }
    },
    modified: {
      type: 'modified'
    }
    
  };
  
  // then use to create Table.
  var People = can.open('people', schemas);

```

### indexes
please see the test file.

### references
please see the test file.

```javascript
  // find one with references
  Blog.findBy('id',  'id value').ref('categories').hasMany('comments').exec(callback);
  // find all with references
  Product.query(filters).ref('categories').hasMany('factories').execSync();
    
```


### more detail
Please see the test part.

### performance test
Please see the performance part.


[validator.js]: https://github.com/chriso/validator.js
[safepass]: https://github.com/bibig/node-safepass