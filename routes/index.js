var path = require('path')
  , request = require('request')
  , qs = require('querystring')
  , Core = require( path.resolve(__dirname, '../plugins/core/core.js') ).Core
  , Evernote = require( path.resolve(__dirname, '../plugins/evernote/evernote.js') ).Evernote

// Show the home page
exports.index = function(req, res) {
  
  // Some flags to be set for client-side logic.
  var isEvernoteAuth = !!req.session.isEvernoteSynced;
  var evernoteServiceName = "Evernote";
  if (isEvernoteAuth){
    if(req.session.evernote.service_type === 'zh'){
      evernoteServiceName = "印象笔记";
    }
  }
  var indexConfig = {
    isEvernoteAuth: !!req.session.isEvernoteSynced,
    isUsingEvernoteDefaultConfig: Evernote.isUsingDefault,
    isEvernoteSandbox: Evernote.sandbox,
    evernoteServiceName: evernoteServiceName,
    error : req.session.error
  }

  if(!req.session.isEvernoteSynced){
    console.warn('Evernote not implemented yet.')
  }
  
  return res.render('index', indexConfig)
  
}

// Show the not implemented yet page
exports.not_implemented = function(req, res) {
  res.render('not-implemented')
}

/* Core stuff */

exports.fetch_md = Core.fetchMd
exports.download_md = Core.downloadMd
exports.fetch_html = Core.fetchHtml
exports.fetch_html_direct = Core.fetchHtmlDirect
exports.download_html = Core.downloadHtml

/* End Core stuff */



/* Evernote Stuff */
exports.oauth_evernote_redirect = function(req, res) {
  var serviceType = req.query.t;
  Evernote.getNewRequestToken(req, res, serviceType, function(error, oauthToken, oauthTokenSecret, results, evernoteClient) {

    if (error){
      req.session.error = JSON.stringify(error);
      console.log(error);
      res.send(req.session.error.data);
      // res.redirect('/');
      return ;
    }
    // Create evernote session object and stash for later.
    req.session.evernote = {}
    req.session.evernote.oauth = {
      request_token: oauthToken,
      request_token_secret: oauthTokenSecret,
      access_token_secret: null,
      access_token: null
    }
    req.session.evernote.service_type = serviceType;
    
    res.redirect(evernoteClient.getAuthorizeUrl(oauthToken))

  }) 
}

exports.oauth_evernote = function(req, res) {
  
  // console.dir(req.query)
    oauth_verifier = req.param('oauth_verifier') 
    if(!req.session.evernote){
      console.log('No evernote session - browser bug')
      req.session.evernote = {}
      req.session.evernote.oauth = {}
    }

    // Create evernote session object and stash for later.
    req.session.evernote.oauth.access_token_secret = null
    req.session.evernote.oauth.access_token = null
  
    // We are now fetching the actual access token and stash in
    // session object values in callback.
    Evernote.getRemoteAccessToken( 
      req.session.evernote.oauth.request_token, 
      req.session.evernote.oauth.request_token_secret,
      oauth_verifier,
      req.session.evernote.service_type,
      function(error, oauthAccessToken, oauthAccessTokenSecret, results){
          if (!!error){
            req.session.error = JSON.stringify(error);
            console.log(error);
            res.redirect('/'); 
          } else {
            console.log(oauthAccessToken)
            req.session.evernote.oauth.access_token_secret = oauthAccessTokenSecret,
            req.session.evernote.oauth.access_token = oauthAccessToken
            req.session.evernote.uid = results 
            req.session.isEvernoteSynced = true
            
            // Check to see it works by fetching account info
            Evernote.getAccountInfo(req.session.evernote, function(user){
              console.log('Got account info!')
              console.log("User %s is now authenticated.", user.username )
            })
            res.redirect('/')
          }
    })
}

exports.unlink_evernote = function(req, res) {
  // Essentially remove the session for evernote...
  var evernote_obj = req.session.evernote;
  Evernote.revokeAccessToken(evernote_obj, function(){
    delete req.session.evernote
    req.session.isEvernoteSynced = false
    res.redirect('/')
  });
}

exports.import_evernote_notes = function(req, res) {

  var guid = req.query.guid;
  var words = req.query.words;
  var offset = req.query.offset;
  var page_size = req.query.page_size;
  Evernote.listNotes(req.session.evernote, guid, words, offset, page_size, function(notes) {
    return res.json(notes)
  })

}

exports.import_evernote_notebooks = function(req, res) {

  Evernote.listNotebooks(req.session.evernote, function(notebooks, collectionCounts) {
    if (!!notebooks.errorCode){
      return res.json(notebooks);
    } else {
      return res.json({notebooks: notebooks, collectionCounts: collectionCounts})
    }
  })

}

exports.fetch_evernote_file = function(req, res) {

  Evernote.fetchEvernoteFile(req,res)
  
}

exports.save_evernote = function(req, res) {

  Evernote.saveToEvernote(req, res)
  
}

exports.list_evernote_versions = function(req, res){
  var guid = req.query.guid;
  Evernote.listNoteVersions(req.session.evernote, guid, function(noteVersionIds){
    return res.json(noteVersionIds);
  });
}

exports.get_evernote_version = function(req, res){
  var guid = req.query.guid;
  var noteVersionId = req.body.noteVersionId;
  Evernote.getNoteVersion(req.session.evernote, guid, noteVersionId, function(note){
    return res.json(note);
  });
}

/* End Evernote stuff */
