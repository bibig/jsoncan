# node-jsoncan

+ A tiny but complete json based database.
+ load seamlessly with zero config.
+ if you are developing a project demo or a static site, or based on small data project like company offical sites, jsoncan is quite useful.
+ all the data is saved in json files, it's like a cache system, and it works the way.
+ using in the right place, it will be convient, fast and effective.


## Install
 npm install jsoncan

## Version
  0.0.2

## Usage	

### create and connection
```javascript
	
	// include engine
	var db = require('jsoncan');
	
	// table root, the json file will save here
	// make sure the path does exist. if not, jsoncan will try to create it.
	var PATH = path.join(__dirname, 'data'); 
	
	// schemas define
	var fields = {
		   id: {
		     text: 'user id',
		     type: 'string',
		     isRandom: true,
		     isUnique: true
		   },
		   name: {
			 text: 'your name',
			 type: 'string',
			 max: 30,
			 min: 2,
			 required: true
		  }
	    };
	
	var tableName = 'people';
	    
	// make a connection, it's easy like open a file
	var People = db.table.create(PATH, tableName, fields);
	
```


### insert
when any record inserted, it will be automatically added an "_id" field as the primary key.

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

### find	

find and findBy only return one record, when no data found, they will return null value;

findAll return mulitply records, if no arguments given, will return the whole records. no data found, return an empty array [].

```javascript

	// find by primary id
	People.find(Tom._id, function (e, record) {...});
	
	// find by unique id
	People.findBy('id', Tom.id, function (e, record) {...});
	
	// find all
	Product.findAll({price: ['>', 100], name: ['like', '%haha%']}, function (e, records) {...} );

```

### query way

query data in more natural and intuitive way.
 

```javascript

	// only 'select()' will return the results, so make sure it's at the tail.
	People.createQuery(function (e, query) {
		var result = query.where(age, '>=', 18)
					.order(name)
					.limit(100)
					.select('id', 'name');
	});
	
	// where ways
	// support operators: =, >, <=, <>, !=, in, not in,  between, like, pattern.
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
	query.order(age).select();
	// in descend
	query.order(age, true).select();
	
	// skip and limit
	query.order('id').skip(3).limit(10).select();
	
	// count, sum and avarge
	query.count(); // will return the records count.
	query.sum('age');
	query.average('age');
	
```

### update

```javascript

	// update by primary field
	Product.update(product._id, {price: 199.99}, function (e, record) {...});
	
	// update by unique field
	User.updateBy('email', user.email, {age: 22}, function (e, record) {...});
	
	// update all
	User.updateAll({age: 17}, {class: 'xxx'}, function (e, records) {...});
	
```

### remove
```javascript

	// delete one
	User.remove(_id, function (e) {...});
	User.removeBy('class', 'xxx', function (e) {...});
	// delete all
	User.removeAll({age, 10}, function (e) {...});
		
```

### the model way
like "query" style, it's more intuitive too.
```javascript

	var Product = db.table.create(path, fields);
	
	// create
	var productA = Product.model({name: 'xxx'}); // or Product.create({...});
	productA.set(price, 2.99);
	product.save(function (e, records) {...});
	
	// load by primary id
	var productB = Product.load('the_primary_id');
	// load by unique field
	var productC = product.load(an_unique_name, 'xxxx');
	
	// use chain
	productA.set(name, 'xxx').save(callback);
	
```

### validate
For data safe, jsoncan will always validate the data automatically before save the data into the json file.
all the validate rules are defined in field schemas object.

so far, you can add these rules.

+ isUnique
+ isNull
+ isRequired
+ required // alias isRequired
+ isEmail
+ isUrl
+ isAlpha
+ isNumeric
+ isUUID
+ isURL
+ isIP // alias isIP4
+ isIP4
+ isIP6
+ isCreditCard
+ isTimestamp
+ shouldAfter [date string]
+ shouldBefore [date string]
+ isAlphanumeric
+ isNumeric
+ isAlpha
+ isDate
+ length
+ size // alias length
+ max // max size
+ min // min size
+ maxValue
+ minValue
+ pattern []regex object]

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

### schemas

the table schemas defined in a normal hash object.
except the above validate rule keys, a schema also support these keys:

+ text
+ type
+ default
+ values // for map or enum type

and the valid type keys are:
+ 'string'
+ 'int',
+ 'float',
+ 'boolean',
+ 'map',
+ 'hash', // map alias
+ 'enum',
+ 'date',
+ 'datetime',
+ 'timestamp',
+ 'text',
+ 'object' // array, hash, function, up to you

examples:

```javascript

	var schemas = {
		id: {
			text: 'user id',
			type: 'string',
			isRandom: true,
			isUnique: true,
			size: 10,
			required: true
		},
		username: {
			text: 'user name',
			type: 'string',
			isUnique: true,
			max: 50,
			min: 2,
			required: true,
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
			default: 0.00
		},
		created: {
			text: 'created',
			type: 'timestamp',
			default: Date.now,
		},
		modified: {
			text: 'modified',
			type: 'timestamp',
			isCurrent: true  // will always update to current timestamp before save.
		}
		
	};
	
	// then use to create Table.
	var People = db.table.create(PATH, 'people', schemas);

```


### more detail
Please see the test files.
