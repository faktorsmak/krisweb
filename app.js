
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , blogroutes = require('./routes/blog.js')
  , http = require('http')
  , path = require('path')
  , expressLayouts = require('express-ejs-layouts')
  , restrict = require('./routes/index.js').restrict;

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/uploads/images' }));
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(expressLayouts);
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.use(function(req, res, next){
	console.log("in the middleware function");
  var err = req.session.error
    , msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// main site paths
app.get('/', routes.index);
app.get('/books', routes.books);
app.get('/books/Cold_Coffee', routes.bookColdCoffee);
app.get('/books/Cold_Coffee/preview', routes.bookColdCoffeePreview);
app.get('/books/Catching_Artemis', routes.bookCatchingArtemis);
app.get('/books/:id', routes.book);
app.get('/stories', routes.stories);
app.get('/stories/:id', routes.story);
app.get('/blog', blogroutes.blog);
app.get('/blog/:id', blogroutes.blogEntry);
app.get('/bio', routes.bio);
app.get('/scraper', routes.urlscrape);

// login paths
app.get('/login', routes.adminLoginGet);
app.post('/login', routes.adminLoginPost);

// admin paths
app.get('/admin', restrict, routes.adminIndex);
app.get('/admin/stories/new', restrict, routes.adminStoriesNew);
app.post('/admin/stories/new', restrict, routes.adminStoriesNewPost);

app.get('/admin/blogentries/new', restrict, blogroutes.adminBlogEntriesNew);
app.post('/admin/blogentries/new', restrict, blogroutes.adminBlogEntriesNewPost);
app.get('/admin/blogentries/edit/:id', restrict, blogroutes.adminBlogEntriesEdit);
app.post('/admin/blogentries/edit', restrict, blogroutes.adminBlogEntriesEditPost);
app.delete('/blog/:id', restrict, blogroutes.adminBlogEntriesDelete);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
