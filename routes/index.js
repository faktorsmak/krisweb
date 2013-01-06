var mongoose = require('mongoose'), 
        db = mongoose.createConnection('localhost', 'test'),
		jsdom = require('jsdom'), 
		request = require('request'),
		hash = require('../pass').hash,
		url = require('url'),
		fs = require('fs'),
 		truncate = require('./utils.js').truncate;


var bookSchema = new mongoose.Schema({ 
        title:String,
        description:String,
        publishdate:Date 
}); 
var Book = db.model('Book', bookSchema); 


var storySchema = new mongoose.Schema({
		title:String,
		content:String,
		image:String,
		submitdate:Date
});
var Story = db.model('Story',storySchema);


// dummy database for login
var users = {
  kris: { name: 'kris' }
};

// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)
hash('alex21', function(err, salt, hash){
  if (err) throw err;
  // store the salt & hash in the "db"
  //console.log("getting ready to store salt and hash in db");
  users.kris.salt = salt;
  users.kris.hash = hash;
});


/*
 * GET home page.
 */

exports.index = function(req, res) {
	res.render('index', { contenttitle : 'Now Available'});
}

exports.books = function(req, res) {
  
    //console.log("books got called with ID of: " + req.params.id);
  	Book.find(function(err, books) { 
    	if (err) { 
            console.log(err);
       } else {
       		// for each book, truncate the description and put ...read more
       		for (var i=0; i < books.length; i++ ) {
       			books[i].description = truncate(books[i].description, 290);
       		}
       		res.render('books', { title : 'Novels', books : books });
       }
  	}); 
}

exports.book = function(req, res) {
	//console.log("get book with id of " + req.params.id);
  	Book.findOne({ _id : req.params.id }, function(err, book) { 
    	if (err) { 
            console.log(err);
       } else {
       		if (book) {
	       		//console.log('found book with id=' + book._id);
	       		res.render('book', { title : book.title, book : book });
       		} else {
       			res.render('notfound', {title : 'Page Not Found'});
       		}
       }
  	}); 	
}

exports.bookColdCoffee = function(req, res) {
	res.render('coldcoffee', { });
}

exports.bookColdCoffeePreview = function(req, res) {
	res.render('coldcoffeepreview', { });
}

exports.bookCatchingArtemis = function(req, res) {
	res.render('catchingartemis', { });
}

exports.stories = function(req, res) {
  	Story.find({}).sort('-submitdate').exec(function(err, stories) { 
    	if (err) { 
            console.log(err);
       } else {
       		// for each book, truncate the description and put ...read more
       		for (var i=0; i < stories.length; i++ ) {
       			stories[i].content = truncate(stories[i].content, 290);
       		}
       		res.render('stories', { title : 'stories', stories : stories, user : req.session.user });
       }
  	}); 
}

exports.story = function(req, res) {
	//console.log("get story with id of " + req.params.id);
  	Story.findOne({ _id : req.params.id }, function(err, story) { 
    	if (err) { 
            console.log(err);
       } else {
       		if (story) {
	       		//console.log('found story with id=' + story._id);
	       		story.content = story.content.replace(/\n/g, '<br />');
	       		res.render('story', { title : story.title, story : story, user : req.session.user });
       		} else {
       			res.render('notfound', {title : 'Page Not Found'});
       		}
       }
  	}); 	
}

exports.bio = function(req, res) {
	res.render('bio', { title : 'Kristina Zakrzewski Bio' });
}

// Admin handlers

exports.restrict = function restrict(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.session.error = 'Please log in to access ' + req.route.path;
		res.redirect('/login?redirectURL=' + req.route.path);
	}
}

exports.adminIndex = function(req, res) {
	res.render('adminIndex', { title : 'Admin' });
}


exports.adminLoginGet = function(req, res){
	// if we're hitting this page not from a redirect, use a friendly login message
	var message = 'Please log in with your username and password.';

	if (req.session.user) {
		req.session.success = 'You are already logged in as ' + req.session.user.name;
		message = req.session.success;
	} else if (req.session.error) {
		message = req.session.error;
	}

	res.render('login', {title : 'Login', message:message, redirectTo: req.query.redirectURL}); 
}


exports.adminLoginPost = function(req, res) {
	authenticate(req.body.username, req.body.password, function(err, user) {
		//console.log("in callback function after authenticate");
		if (user) {
			// Regenerate session when signing in
			// to prevent fixation
			req.session.regenerate(function() {
				// Store the user's primary key
				// in the session store to be retrieved,
				// or in this case the entire user object
				req.session.user = user;
				res.redirect('admin');
			});
		} else {
			req.session.error = 'Authentication failed, please check your username and password.';
			res.redirect('login');
		}
	});
}

exports.adminStoriesNew = function(req,res) {
	res.render('newstory', { title : 'New Story' });
}

exports.adminStoriesNewPost = function(req,res) {
	var story = new Story();
	story.title = req.body.title;
	//console.log("story title: " + story.title);
	story.content = req.body.content;
	//console.log("story content: " + story.content);
	story.image = req.files.image.name;
	//console.log("story image: " + story.image);
	story.submitdate = new Date();
	//console.log("story date: " + story.date);
	story.save(function(err, newStory) {
		if (err) throw err;
  		//console.log("Submitted a story with ID: " + newStory._id);
  		if (story.image.length > 0) {
		    // rename the uploaded image (if there was one) to use the ID
		    var tmp_path = req.files.image.path;
		    // set where the file should actually exists - in this case it is in the "images" directory
		    var target_path = './krisweb/public/images/stories/' + newStory._id;
		    // move the file from the temporary location to the intended location
		    fs.rename(tmp_path, target_path, function(err) {
		        if (err) throw err;
		        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
		        fs.unlink(tmp_path, function() {
		            if (err) throw err;
			  		res.redirect('/stories/' + newStory._id);
		        });
		    });
		  } else {
		  	res.redirect('/stories/' + newStory._id);
		  }
	});
}

exports.adminStoriesEdit = function(req,res) {
	//console.log("get story with id of " + req.params.id);
  	Story.findOne({ _id : req.params.id }, function(err, story) { 
    	if (err) { 
            console.log(err);
       		res.render('notfound', {title : 'Page Not Found'});
       } else {
       		if (story) {
	       		//console.log('found story with id=' + story._id);
				res.render('editstory', { title : 'Edit Story', story : story });
       		} else {
       			res.render('notfound', {title : 'Page Not Found'});
       		}
       }
  	}); 	
}

exports.adminStoriesEditPost = function(req,res) {
	//console.log("get story for update with id of " + req.body.id);
  	Story.findOne({ _id : req.body.id }, function(err, story) { 
    	if (err) { 
            console.log(err);
       		res.render('notfound', {title : 'Page Not Found'});
       } else {
       		if (story) {
				story.title = req.body.title;
				//console.log("story title: " + story.title);
				story.content = req.body.content;
				//console.log("story content: " + story.content);
				story.image = req.files.image.name;
				//console.log("story image: " + story.image);
				
				story.save(function(err) {
					if (err) throw err;
			  		console.log("Updated the story with ID: " + story.id);

					if (story.image.length > 0) {
					    var tmp_path = req.files.image.path;
					    // set where the file should actually exists - in this case it is in the "images" directory
					    var target_path = './krisweb/public/images/stories/' + story._id;
					    // move the file from the temporary location to the intended location
					    fs.rename(tmp_path, target_path, function(err) {
					        if (err) throw err;
					        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
					        fs.unlink(tmp_path, function() {
					            if (err) throw err;
								res.redirect('/stories/' + story._id);
					        });
					    });
					} else {
						res.redirect('/stories/' + story._id);
					}
				});

       		} else {
       			res.render('notfound', {title : 'Page Not Found'});
       		}
       }
  	}); 	
}


exports.urlscrape = function(req, res) {
   	//Tell the request that we want to fetch youtube.com, send the results to a callback function
    request({uri: 'http://youtube.com'}, function(err, response, body){
                var self = this;
      self.items = new Array();//I feel like I want to save my results in an array
       
      //Just a basic error check
                if(err && response.statusCode !== 200){console.log('Request error.');}
                //Send the body param as the HTML code we will parse in jsdom
      //also tell jsdom to attach jQuery in the scripts and loaded from jQuery.com
      jsdom.env({
                        html: body,
                        scripts: ['http://code.jquery.com/jquery-1.6.min.js']
                }, function(err, window){
         //Use jQuery just as in a regular HTML page
                        var $ = window.jQuery;
                         
                        console.log($('title').text());
                        res.end($('title').text());
                });
        });        
}

// Authenticate using our plain-object database of doom!
function authenticate(name, pass, fn) {
	//console.log("in authenticate method");
  if (!module.parent) console.log('authenticating %s:%s', name, pass);
  var user = users[name];
  //console.log("getting ready to validate user " + user);
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  //console.log("getting ready to call hash function");
  hash(pass, user.salt, function(err, hash){
    if (err) return fn(err);
    if (hash == user.hash) return fn(null, user);
    console.log("invalid password");
    fn(new Error('invalid password'));
  })
}
