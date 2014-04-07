
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')

var app = express()

app.configure(function(){
  app.set('port', process.env.PORT || 8000)
  app.set('views', __dirname + '/views')
  app.set('view engine', 'ejs')
  app.use(express.favicon())
  app.use(express.logger('dev'))
  app.use(express.compress())
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(express.cookieParser('your secret here'))
  app.use(express.cookieSession())
  app.use(app.router)
  app.use(require('stylus').middleware(__dirname + '/public'))
  app.use(express.static(path.join(__dirname, 'public')))

  app.locals.title = "小书匠,在线编辑器,MARKDOWN,Evernote,文件版本"
  app.locals.description = "小书匠在线编辑器是一个从书匠网上独立开的在线编辑器，主要是为了方便那些想仅仅使用一个在线markdown编辑器进行编辑的用户"
  app.locals.node_version = process.version.replace('v', '')
  app.locals.app_version = require('./package.json').version
  app.locals.env = process.env.NODE_ENV
  app.locals.readme = fs.readFileSync( path.resolve(__dirname, './help.md'), 'utf-8')
})

app.configure('development', function(){
  app.use(express.errorHandler())
})

app.get('/', routes.index)

app.get('/not-implemented', routes.not_implemented)
app.get('/cache.manifest', routes.cache_manifest)

/* Begin Evernote */

app.get('/redirect/evernote', routes.oauth_evernote_redirect)

app.get('/oauth/evernote', routes.oauth_evernote)

app.get('/unlink/evernote', routes.unlink_evernote)

app.get('/import/evernote/notebooks', routes.import_evernote_notebooks)

app.get('/import/evernote/notes', routes.import_evernote_notes)
app.get('/list/evernote/versions', routes.list_evernote_versions)
app.get('/get/evernote/version', routes.get_evernote_version)

app.post('/fetch/evernote', routes.fetch_evernote_file)

app.post('/save/evernote', routes.save_evernote)

/* End Evernote */
app.post('/factory/fetch_markdown', routes.fetch_md)
app.get('/files/md/:mdid', routes.download_md)
app.post('/factory/fetch_html', routes.fetch_html)
app.post('/factory/fetch_html_direct', routes.fetch_html_direct)
app.get('/files/html/:html', routes.download_html)
// process.on('uncaughtException', function (err) {
//  console.log(err);
// });
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'))
  console.log("\nhttp://localhost:" + app.get('port') + "\n")
})
