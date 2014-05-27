var should  = require('should');
var Jsoncan = require('../index');
var path    = require('path');
var PATH    = path.join(__dirname, 'table_counter_test');
var fs      = require('fs');

describe('counter update test', function () {
  
  var tables = {
    categories: {
      id: { type: 'random', size: 6, required: true, isUnique: true, index: true },
      name: { type: 'string', max: 30, required: true},
      blogs: { type: 'int', required: true, default: 0}
    },
    blogs: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      _category: { type: 'ref', required: true, counter: 'blogs'},
      created:  { type: 'created' },
      comments: { type: 'int', required: true, default: 0}
    },
    comments: {
      id: { type: 'autoIncrement', isIndex: true},
      title: { type: 'string', max: 100, required: true},
      _blog: { type: 'ref', required: true, counter: 'comments'},
      created: { type: 'created' }
    }
  };
  var can = new Jsoncan(PATH, tables);
  
  var Blogs = can.open('blogs');
  var Categories = can.open('categories');
  var Comments = can.open('comments');
  var aCategoryCount = 10;
  var bCategoryCount = 15;  
  var aBlogCommentCount = 11;
  var bBlogCommentCount = 13;
  
  
  function addData () {
    var categoryA = Categories.insertSync({name: 'a'});
    var categoryB = Categories.insertSync({name: 'b'});
    var blogA = Blogs.insertSync({ _category: categoryA, title: 'a'});
    var blogB = Blogs.insertSync({ _category: categoryB, title: 'b'});
    var i;
    // console.log(categoryA);
    for (i = 1; i < aCategoryCount; i++) {
      Blogs.insertSync({ _category: categoryA, title: 'a'});
    }
    
    for (i = 1; i < bCategoryCount; i++) {
      Blogs.insertSync({ _category: categoryB, title: 'b'});
    }
        
    for (i = 0; i < aBlogCommentCount; i++) {
      Comments.insertSync({ _blog: blogA, title: '...' });
    }
    
    for (i = 0; i < bBlogCommentCount; i++) {
      Comments.insertSync({ _blog: blogB, title: '...' });
    }
  }
  
  before(function () {
    addData();
  });
  

  after(function (done) {
    can.drop(done);
  });

  it('check init categories data', function () {
    var recordA = Categories.query().where('name', 'a').execSync()[0];
    var recordB = Categories.query().where('name', 'b').execSync()[0];
    recordA.blogs.should.equal(aCategoryCount);
    recordB.blogs.should.equal(bCategoryCount);
  });
  
  it('check init blogs data', function () {
    var recordA = Blogs.query().where('title', 'a').where('comments', '>', 0).limit(1).execSync()[0];
    var recordB = Blogs.query().where('title', 'b').limit(1).execSync()[0];
    
    recordA.comments.should.equal(aBlogCommentCount);
    recordB.comments.should.equal(bBlogCommentCount);
  });
  
  it('check insert async way', function (done) {
    var recordA = Blogs.query().where('title', 'a').where('comments', '>', 0).limit(1).execSync()[0];
    Blogs.insert({ title: 'aa', _category: recordA._category}, function (e, record) {
      var category = Categories.find(recordA._category).execSync();
      should.not.exist(e);
      category.blogs.should.equal(aCategoryCount + 1);
      done();
    });
  });
  
  it('check insertAll async way', function (done) {
    var recordA = Blogs.query().where('title', 'a').where('comments', '>', 0).limit(1).execSync()[0];
    Blogs.insertAll([
        { title: 'aa', _category: recordA._category },
        { title: 'aa', _category: recordA._category },
        { title: 'aa', _category: recordA._category }
      ], function (e, records) {
      var category = Categories.find(recordA._category).execSync();
      should.not.exist(e);
      category.blogs.should.equal(aCategoryCount + 1 + records.length);
      done();
    });
  });
  
  it('check removeAll async way', function (done) {
    var recordA = Blogs.query().where('title', 'a').where('comments', '>', 0).limit(1).execSync()[0];
    Blogs.removeAll({ title: 'aa'}, function (e, records) {
      var category = Categories.find(recordA._category).execSync();
      should.not.exist(e);
      category.blogs.should.equal(aCategoryCount);
      done();
    });
  });
  
  it('check remove async way', function (done) {
    var recordA = Blogs.query().where('title', 'a').where('comments', '>', 0).limit(1).execSync()[0];
    Blogs.remove(recordA._id, function (e, record) {
      var category = Categories.find(recordA._category).execSync();
      should.not.exist(e);
      category.blogs.should.equal(aCategoryCount - 1);
      done();
    });
  });
  
  it('check remove sync way', function () {
    var recordB = Blogs.query().where('title', 'b').where('comments', '>', 0).limit(1).execSync()[0];
    
    Blogs.removeSync(recordB._id);
    var category = Categories.find(recordB._category).execSync();
    category.blogs.should.equal(bCategoryCount - 1);
  });

}); // end