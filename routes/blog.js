var mongoose = require('mongoose'), 
        db = mongoose.createConnection('localhost', 'test'),
		jsdom = require('jsdom'), 
		request = require('request'),
		hash = require('../pass').hash,
		url = require('url'),
		fs = require('fs'),
 		truncate = require('./utils.js').truncate,
        email   = require("emailjs");

var blogEntrySchema = new mongoose.Schema({
		title:String,
		content:String,
		image:Number, /* size of the image */
		link:String,
		linktitle:String,
		linkimage:String,
		linkdescription:String,
		submitdate:Date,
		comments: [{ 
		            commentid: String,
					body: String,
					userid: String,
                    username: String,
					usertype: String, // facebook 
					userpic: String,  // url to pic
					date: Date 
				}]
});
var BlogEntry = db.model('BlogEntry',blogEntrySchema);

/* ----------------------------------------------------------*/

exports.blog = function(req, res) {
	var start = 0;
	var pagelimit = 4;
	var onPage = 1;
	var numPages = 1;

	BlogEntry.count({}, function(err, totalEntries) {
		//console.log("there are " + totalEntries + " total blog entries");
		
		numPages = totalEntries / pagelimit;
		numPages = Math.round(numPages + 0.4);
		
		//console.log("there are a total of " + numPages + " pages.");
		if (req.query.page) {
			// figure out the start given the page 
			onPage = req.query.page;
			start = (onPage-1) * pagelimit;
			//console.log("setting the start page to " + start);
		}
	
	  	BlogEntry.find({}).skip(start).limit(pagelimit).sort('-submitdate').exec(function(err, blogentries) { 
	    	if (err) { 
	            console.log(err);
	       } else {
	       		//console.log("getting ready to render");
	       		res.render('blog', { title : 'Blog', blogentries : blogentries,  pages : numPages, page : onPage, user : req.session.user });
	       }
	  	}); 
	});
}

exports.blogEntry = function(req, res) {
	//console.log("get blog entry with id of " + req.params.id);
  	BlogEntry.findOne({ _id : req.params.id }, function(err, blogentry) { 
    	if (err) { 
            console.log(err);
       		res.render('notfound', {title : 'Page Not Found'});
       } else {
       		if (blogentry) {
	       		//console.log('found blog with id=' + blogentry._id);
	       		blogentry.content = blogentry.content.replace(/\n/g, '<br />');
	       		//console.log("image is: ", blogentry.image);
	       		res.render('blogentry', { title : blogentry.title, blogentry : blogentry, user : req.session.user });
       		} else {
       			res.render('notfound', {title : 'Page Not Found'});
       		}
       }
  	}); 	
}

exports.addComment = function(req, res) {
//    console.log("in addComment", req);
    var comment = JSON.parse(req.body.properties);
    // comment has properties: blogid, userid, username, body
    console.log(comment);
    //res.json({success:true});
    
    BlogEntry.findOne({ _id : comment.blogid }, function(err, blogentry) {
        if (err) {
            console.log(err);
            res.json(500, {error: 'No blog entry found with id' + comment.blogid });
       } else {
            if (blogentry) {
                var comments = [];
                comments = blogentry.comments;
                blogentry.comments.push({
                    body: comment.body,
                    userid: comment.userid,
                    username: comment.username,
                    usertype: 'facebook',
                    userpic: comment.userpic,
                    date: new Date()
                });
                blogentry.save(function(err, newEntry) {
                    if (err) throw err;
                    
                    /*
                    // send an email to notify us
                    var server  = email.server.connect({
                       user:    "xxxx", 
                       password:"xxxx", 
                       host:    "smtp.gmail.com", 
                       ssl:     true
                    
                    });
                    
                    // send the message and get a callback with an error or details of the message that was sent
                    server.send({
                       text:    "You got a new comment on kristinazakrzewski.com - http://www.kristinazakrzewski.com/blog/" + newEntry._id, 
                       from:    "Rob <rob.zakrzewski@gmail.com>", 
                       to:      "Kris <kzakrzewski@gmail.com>",
                       cc:      "Rob <rob.zakrzewski@gmail.com>",
                       subject: "Somebody commented on a blog entry on kristinazakrzewski.com"
                    }, function(err, message) { console.log(err || message); });
                    */

                    res.json({success:true, commentid: newEntry.comments[newEntry.comments.length-1]._id});
                });

            } else {
                res.json(500, {error : 'Blog Entry Not Found'});
            }
       }
    });   
}

exports.deleteComment = function(req, res) {
    var commentProps = JSON.parse(req.body.properties);
    // comment has properties: blogid, commentid
    console.log(commentProps);
    //res.json({success:true});
    
    BlogEntry.findOne({ _id : commentProps.blogid }, function(err, blogentry) {
        if (err) {
            console.log(err);
            res.json(500, {error: 'No blog entry found with id' + commentProps.blogid });
       } else {
            if (blogentry) {
                var comment = blogentry.comments.id(commentProps.commentid).remove();
                console.log(blogentry);
                blogentry.save(function(err) {
                    if (err) throw err;
                    res.json({success:true});
                });

            } else {
                res.json(500, {error : 'Blog Entry Not Found'});
            }
       }
    });   
}

/* ----------------- admin methods -------------------------- */

exports.adminBlogEntriesNew = function(req,res) {
	res.render('newblogentry', { title : 'New Blog Entry' });
}

exports.adminBlogEntriesNewPost = function(req,res) {
	var entry = new BlogEntry();
	entry.title = req.body.title;
	//console.log("blog entry title: " + entry.title);
	entry.content = req.body.content;
	entry.image = req.files.image.size;
	//console.log("entry image size is: ", req.files.image.size)

	//console.log("blog entry content: " + entry.content);
	// TODO: need to look at content and parse out URLs and scrape them for OpenGraph and set image and video links (first one only)
	entry.link = '';
	entry.linktitle = '';
	entry.linkimage = '';
	entry.linkdescription = '';
	entry.submitdate = new Date();
	//console.log("blog entry date: " + entry.date);

	entry.save(function(err, newEntry) {
		if (err) throw err;

		if (entry.image > 0) {
	  		//console.log("Submitted a blog entry with ID: " + newEntry._id);
		    var tmp_path = req.files.image.path;
		    // set where the file should actually exists - in this case it is in the "images" directory
		    var target_path = './krisweb/public/images/blog/' + newEntry._id;
		    // move the file from the temporary location to the intended location
		    fs.rename(tmp_path, target_path, function(err) {
		        if (err) throw err;
		        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
		        fs.unlink(tmp_path, function() {
		            if (err) throw err;
					res.redirect('/blog');
		        });
		    });
		} else {
			res.redirect('/blog');
		}
	});
}

exports.adminBlogEntriesEdit = function(req,res) {
	//console.log("get blog entry with id of " + req.params.id);
  	BlogEntry.findOne({ _id : req.params.id }, function(err, blogentry) { 
    	if (err) { 
            console.log(err);
       		res.render('notfound', {title : 'Page Not Found'});
       } else {
       		if (blogentry) {
	       		//console.log('found blog with id=' + blogentry._id);
				res.render('editblogentry', { title : 'Edit Blog Entry', blogentry : blogentry });
       		} else {
       			res.render('notfound', {title : 'Page Not Found'});
       		}
       }
  	}); 	
}

exports.adminBlogEntriesEditPost = function(req,res) {
	//console.log("get blog entry for update with id of " + req.body.id);
  	BlogEntry.findOne({ _id : req.body.id }, function(err, blogentry) { 
    	if (err) { 
            console.log(err);
       		res.render('notfound', {title : 'Page Not Found'});
       } else {
       		if (blogentry) {
	       		//console.log('found blog with id=' + blogentry._id);
				blogentry.title = req.body.title;
				//console.log("blog entry title: " + blogentry.title);
				blogentry.content = req.body.content;
				//console.log("blog entry content: " + blogentry.content);
				blogentry.image = req.files.image.size;
				//console.log("entry.image is: ", blogentry.image);
				
				// TODO: need to look at content and parse out URLs and scrape them for OpenGraph and set image and video links (first one only)
				blogentry.link = '';
				blogentry.linktitle = '';
				blogentry.linkimage = '';
				blogentry.linkdescription = '';
				//console.log("blog entry date: " + blogentry.date);
			
				blogentry.save(function(err) {
					if (err) throw err;
			  		//console.log("Updated the blog entry with ID: " + blogentry.id);

					if (blogentry.image > 0) {
				  		//console.log("Submitted a blog entry with ID: " + newEntry._id);
					    var tmp_path = req.files.image.path;
					    // set where the file should actually exists - in this case it is in the "images" directory
					    var target_path = './krisweb/public/images/blog/' + blogentry._id;
					    // move the file from the temporary location to the intended location
					    fs.rename(tmp_path, target_path, function(err) {
					        if (err) throw err;
					        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
					        fs.unlink(tmp_path, function() {
					            if (err) throw err;
								res.redirect('/blog');
					        });
					    });
					} else {
						res.redirect('/blog');
					}
				});

       		} else {
       			res.render('notfound', {title : 'Page Not Found'});
       		}
       }
  	}); 	
}

exports.adminBlogEntriesDelete = function(req,res) {
	//console.log("get blog entry with id of " + req.params.id + " for delete.");
  	BlogEntry.findByIdAndRemove(req.params.id, function(err, blogentry) { 
    	if (err) { 
            console.log(err);
            console.log("The blog entry could not be deleted");
	  		res.json(500, { message: 'Could not delete blog entry with ID: ' + req.params.id + '[' + err + ']' })
       } else {
	  		//console.log("Deleted the blog entry with ID: " + req.params.id);
	  		res.json(200, { message: 'Deleted the blog entry with ID: ' + req.params.id })
       }
  	}); 	

}
