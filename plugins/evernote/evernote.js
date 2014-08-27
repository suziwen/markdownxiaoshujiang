var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , ENManager = require('evernote').Evernote
  , qs = require('querystring')
  , url = require('url')
  , jsdom = require('jsdom').jsdom
  , html2markdown = require('html2markdown')
  , marked = require('marked')
  , Converter = require('../../public/js/Markdown.Converter').Converter
  , getSanitizingConverter = require("../../public/js/Markdown.Sanitizer").getSanitizingConverter
  , Extra = require('../../public/js/Markdown.Extra').Extra
  , _ = require('lodash')
  , juice = require('juice');

var converter = new Converter();
converter = getSanitizingConverter();
Extra.init(converter);
var cssFiles = fs.readFileSync(path.resolve(__dirname, '../../public/css/evernote.css')).toString() + '\n' + 
              fs.readFileSync(path.resolve(__dirname, '../../public/css/styles/default.css')).toString() + '\n';
var jquery = fs.readFileSync(path.resolve(__dirname, '../../public/js/jquery.min.js')).toString();
var jqueryHtmlClean = fs.readFileSync(path.resolve(__dirname, '../../public/js/jquery.htmlClean.js')).toString();
var evernote_config_file = path.resolve(__dirname, 'evernote-config.json')
  , evernote_config = {}
  , isUsingDefaultConfig = true

if(fs.existsSync(evernote_config_file)) {
  evernote_config = JSON.parse( fs.readFileSync( evernote_config_file, 'utf-8' ) )
  isUsingDefaultConfig = false
} else {
  evernote_config = {
    "consumerKey": "YOUR_KEY"
  , "consumerSecret": "YOUR_SECRET"
  , "sandbox": true
  , "serviceHost": "" 
  }
  console.warn('Evernote config not found at ' + evernote_config_file + '. Using defaults instead.')
}
  sandbox = evernote_config.sandbox;
exports.Evernote = (function() {

  function htmlEntities(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var callbackUrl = evernote_config.callback_url;
  var getServiceHost = function(serviceType){
     if (serviceType === 'zh'){
      return "app.yinxiang.com";
     }
     return ""
   }
  var createNote = function(evernote_obj, title, content, notebookGuid, cb){
      var note = new ENManager.Note({title: title, notebookGuid: notebookGuid, content: content});
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var noteStore = client.getNoteStore();
      var userStore = client.getUserStore();
      userStore.getNoteStoreUrl(function(noteStoreUrl){
        if (typeof(noteStoreUrl) == 'string'){
          noteStore.createNote(note, function(note){
            if (!!cb ){
              cb(note);
            }
          });
        } else {
          cb(noteStoreUrl);
        }
      });
    };
   var updateNote = function(evernote_obj, guid, title, content, cb){
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var noteStore = client.getNoteStore();
      var note = new ENManager.Note({guid: guid, title: title, content:content});
      var userStore = client.getUserStore();
      userStore.getNoteStoreUrl(function(noteStoreUrl){
        if (typeof(noteStoreUrl) == 'string'){
          noteStore.updateNote(note, function(note){
            if (!!cb) {
              cb(note);
            }
          });
        } else {
          cb(noteStoreUrl);
        }
      });
    };
   var generateRandomFilename = function(ext){
    return 'xiaoshujiang_' +(new Date()).toISOString().replace(/[\.:-]/g, "_")+ '.' + ext
  }
   var formateToEvernoteContent = function(content){
      var xmldtd = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">\n';
      content = xmldtd + '<en-note>' + content + '</en-note>';
      return content

   }
  return {
    isUsingDefault: isUsingDefaultConfig,
    config: evernote_config,
    getNewRequestToken: function(req, res, serviceType, cb) {

      // Create your auth_url for the view   
      var serviceHost = getServiceHost(serviceType);
      var EvernoteClient = new ENManager.Client({ 
        "consumerKey": evernote_config.consumerKey, 
        "consumerSecret": evernote_config.consumerSecret, 
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost });
      EvernoteClient.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results){

        return cb(error, oauthToken, oauthTokenSecret, results, EvernoteClient)

      })

    },
    getRemoteAccessToken: function(request_token, request_token_secret, oauth_verifier, serviceType, cb) {
      if(!oauth_verifier){
        cb(true);
      }else{
        var serviceHost = getServiceHost(serviceType);
        var EvernoteClient = new ENManager.Client({ 
          "consumerKey": evernote_config.consumerKey, 
          "consumerSecret": evernote_config.consumerSecret, 
          "sandbox": evernote_config.sandbox,
          "serviceHost": serviceHost });
        EvernoteClient.getAccessToken(request_token, request_token_secret, oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results){
            return cb(error, oauthAccessToken, oauthAccessTokenSecret, results)
        })
      
      }

    }, // end getRemoteAccessToken()
    revokeAccessToken: function(evernote_obj, cb){
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var userStore = client.getUserStore();
      userStore.revokeLongSession(cb);
    },
    getAccountInfo: function(evernote_obj, cb) {
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var userStore = client.getUserStore()

      userStore.getUser(function(user){
        return cb(user)
      })
      
    }, // end getAccountInfo()
    fetchEvernoteFile: function(req, res) {
      if(!req.session.isEvernoteSynced){
        res.type('text/plain')
        return res.status(403).send("evernote用户未被授权成功")
      } 

      var evernote_obj = req.session.evernote;
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var noteStore = client.getNoteStore();            
      var guid = req.body.guid;
      var format = req.body.format;
      var userStore = client.getUserStore();
      userStore.getNoteStoreUrl(function(noteStoreUrl){
        if (typeof(noteStoreUrl) == 'string'){
          noteStore.getNote(guid, true, true, true, true, function(note){
            jsdom.env({
              html:note.content,
              src: [jquery],
              done: function(error, window){
                var $ = window.$;
                $('en-crypt').remove();
                $('en-todo').remove();
                $('en-media').remove();
                var content = $('en-note').html().trim();
                if ('markdown' == format || $('en-note br[title="markdown"]').length > 0){
                  content = html2markdown(content);
                }

                var result = {
                  title: note.title,
                  content: content.trim(),
                  originContent: note.content,
                  guid: note.guid,
                  notebookGuid: note.notebookGuid
                }
                return res.json(result);
              }
            });
          });
        } else {
          res.json(noteStoreUrl);
        }
      }); 
    },
    listNotebooks: function(evernote_obj, cb) {
      
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var noteStore = client.getNoteStore() 

      var userStore = client.getUserStore();
      userStore.getNoteStoreUrl(function(noteStoreUrl){
        if (typeof(noteStoreUrl) == 'string'){
          noteStore.listNotebooks(function(notebooks){
            var filter = new ENManager.NoteFilter();
            noteStore.findNoteCounts(filter, false, function(collectionCounts){
              cb(notebooks, collectionCounts);
            });
          });
        } else {
          cb(noteStoreUrl);
        }
      });
    },
    listNotes: function(evernote_obj, guid, query_str, offset, pagesize, cb){
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var noteStore = client.getNoteStore();
      var filter = new ENManager.NoteFilter({order: ENManager.NoteSortOrder.UPDATED, notebookGuid: guid, words: query_str});
      var spec = new ENManager.NotesMetadataResultSpec({includeTitle: true});
      var userStore = client.getUserStore();
      userStore.getNoteStoreUrl(function(noteStoreUrl){
        if (typeof(noteStoreUrl) == 'string'){
          noteStore.findNotesMetadata(filter, offset, pagesize, spec, function(notes){
            cb(notes);
          });
        } else {
          cb(noteStoreUrl);
        }
      });
    },

    saveToEvernote: function(req, res){

      if(!req.session.isEvernoteSynced){
        res.type('text/plain')
        return res.status(403).send("You are not authenticated with Evernote.")
      } 

      var evernote_obj = req.session.evernote;

      var guid = req.body.guid;
      var title = req.body.title;
      var format = req.body.format;
      var notebook_guid = req.body.notebook_guid;
      if (!title) {
        title = generateRandomFilename('md')
      }
      var contents = req.body.fileContents || '测试数据';
      var htmlContents = req.body.fileHtmlContents || '<div>测试数据</div>';
      jsdom.env({
        html: '<html><body></body></html>',
        src: [jquery, jqueryHtmlClean],
        done: function(error, window){
          var $ = window.$;
          if ('markdown'!=format){
            contents = juice.inlineContent(htmlContents, cssFiles);
            $('body').html(contents);
            contents = $('body').html();
            contents = $.htmlClean(contents, {
              replaceStyles: [],
              allowedAttributes: [['style']],
              removeAttrs:['class','id', 'accesskey', 'data', 'dynsrc', 'tabindex']
            });
          } else {
            contents = htmlEntities(contents);
            contents = contents.split('\n').join('<br title="markdown"/>');
          }
          var content = formateToEvernoteContent(contents);
          if (!guid) {
            createNote(evernote_obj, title, content, notebook_guid, function(note){
              return res.json(note);
            });
          } else {
            updateNote(evernote_obj, guid, title, content, function(note){
              return res.json(note);
            });
          }
        }
      });
    }, // end saveToEvernote
    listNoteVersions: function(evernote_obj, noteGuid, cb){
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var noteStore = client.getNoteStore();
      var userStore = client.getUserStore();
      userStore.getNoteStoreUrl(function(noteStoreUrl){
        if (typeof(noteStoreUrl) == 'string'){
          noteStore.listNoteVersions(noteGuid, function(noteVersionIds){
            cb(noteVersionIds);
          });
        } else {
          cb(noteStoreUrl);
        }
      });
    },
    getNoteVersion: function(evernote_obj, noteGuid, noteVersionId, cb){
      var serviceHost = getServiceHost(evernote_obj.service_type);
      var client = new ENManager.Client({
        token: evernote_obj.oauth.access_token,
        "sandbox": evernote_config.sandbox,
        "serviceHost": serviceHost
      });
      var noteStore = client.getNoteStore();
      var userStore = client.getUserStore();
      userStore.getNoteStoreUrl(function(noteStoreUrl){
        if (typeof(noteStoreUrl) == 'string'){
          noteStore.getNoteVersion(noteGuid, noteVersionId, function(note){
            cb(note);
          });
        } else {
          cb(noteStoreUrl);
        }
      });     
    }
  }
  
})()

