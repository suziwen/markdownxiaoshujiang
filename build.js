
var walkdir = require('walkdir')
  , path = require('path')
  , fs = require('fs')

function walkAndUnlink(dirPath, regex){
  
  var emitter = walkdir(dirPath)

  emitter.on('file',function(filename,stat){
    if( regex.test(filename) ){
      console.log("Removing old file: " + filename)
      fs.unlinkSync( path.resolve( dirPath, filename) )
    }
  })
  
}

// 删除旧文件.
function cleaner(){
    walkAndUnlink( path.join(__dirname, 'public', 'css'), new RegExp(/style-/) )
    walkAndUnlink( path.join(__dirname, 'public', 'js'), new RegExp(/dependencies-/) )
    walkAndUnlink( path.join(__dirname, 'public', 'js'), new RegExp(/story-/) )
}

// Concats, minifies js and css for production
function smoosher(){

  // Compress/concat files for deploy env...
  // Need to run this locally BEFORE deploying
  // to nodejitsu
  require('smoosh').make({
    "VERSION": require('./package.json').version,
    "JSHINT_OPTS": {
      "browser": true,
      "evil":true, 
      "boss":true, 
      "asi": true, 
      "laxcomma": true, 
      "expr": true, 
      "lastsemic": true, 
      "laxbreak":true,
      "regexdash": true,
    },
    "JAVASCRIPT": {
      "DIST_DIR": "./public/js",
      "dependencies": [ { "src": "./public/js/bootstrap.js", "jshint": false}, 
                        { "src": "./public/js/underscore.js", "jshint": false}, 
                        { "src": "./public/js/jwerty.js", "jshint": false},
                        { "src": "./public/js/bootstrap-notify.js", "jshint": false},
                        { "src": "./public/js/jquery.icheck.js", "jshint": false},
                        { "src": "./public/js/transformjs.1.0.beta.2.js", "jshint": false},
                        { "src": "./public/js/select2.js", "jshint": false}, 
                        { "src": "./public/js/select2_locale_zh-CN.js", "jshint": false}, 
                        { "src": "./public/js/difflib.js", "jshint": false}, 
                        { "src": "./public/js/diffview.js", "jshint": false}, 
                        { "src": "./public/js/diff_match_patch_uncompressed.js", "jshint": false}, 
                        { "src": "./public/js/FileSaver.js", "jshint": false}, 
                        { "src": "./public/js/md5.js", "jshint": false}, 
                        { "src": "./public/js/Blob.js", "jshint": false}, 
                        { "src": "./public/js/screenfull.js", "jshint": false}, 
                        { "src": "./public/js/highlight.pack.js", "jshint": false}, 
                        { "src": "./public/js/Markdown.Converter.js", "jshint": false},
                        { "src": "./public/js/Markdown.Sanitizer.js", "jshint": false},
                        { "src": "./public/js/Markdown.Extra.js", "jshint": false},
                        { "src": "./public/js/markdown_dom_parser.js", "jshint": false},
                        { "src": "./public/js/html2markdown.js", "jshint": false},
                        { "src": "./public/js/toc.js", "jshint": false}
		      ],
      "story": [ "./public/js/story.js" ]
    },
    "CSS": {
      "DIST_DIR": "./public/css",
      "style": [ "./public/css/bootstrap.css", "./public/css/bootstrap-responsive.css", "./public/css/bootstrap-notify.css", "./public/css/flat/blue.css", "./public/css/select2/select2.css", "./public/css/diffview.css", "./public/css/zeneditor.css", "./public/css/style.css", "./public/css/styles/default.css" ]
    }
  })
  .done(function(){
    console.log('\nSmoosh all finished...\n')
  })
  
}

cleaner()
setTimeout(smoosher,750)
