var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')
  , Converter = require("../../public/js/Markdown.Converter").Converter
  , getSanitizingConverter = require("../../public/js/Markdown.Sanitizer").getSanitizingConverter
  , Extra = require("../../public/js/Markdown.Extra").Extra
  , Iconv = require('iconv').Iconv
  // , phantomjs = require('phantomjs')
  // , child = require('child_process')

exports.Core = (function(){
  
  var converter = new Converter();
  //converter = getSanitizingConverter();
  Extra.init(converter);
  function _generateRandomMdFilename(ext){
    return 'story_' +(new Date()).toISOString().replace(/[\.:-]/g, "_")+ '.' + ext
  }
  
  function _getHtml(str){
    return converter.makeHtml(str) 
  }

  var iconv = new Iconv('UTF-8', 'GBK//IGNORE');
  return {
    fetchMd: function(req,res){
      var unmd = req.body.unmd
        , json_response = 
        {
          data: ''
        , error: false
        }

      // TODO: maybe change this to user submitted filename or name of repo imported file?
      var name = _generateRandomMdFilename('md') 
      var filename = path.resolve(__dirname, '../../public/files/md/' + name )

      // TODO: THIS CAN BE OPTIMIZED WITH PIPING INSTEAD OF WRITING TO DISK
      fs.writeFile( filename, unmd, 'utf8', function(err, data){

        if(err){
          json_response.error = true
          json_response.data = "Something wrong with the markdown conversion."
          res.send( JSON.stringify( json_response) )
          console.error(err)     
        }
        else{
          json_response.data = name
          res.send( JSON.stringify( json_response) )
         }
      }) // end writeFile
    },
    downloadMd: function(req,res){
      
      var fileId = req.params.mdid

      var fileName = req.query.fileName;
      if (!fileName){
        fileName = fileId;
      }
      fileName = iconv.convert(fileName).toString('binary');
      var filePath = path.resolve(__dirname, '../../public/files/md/' + fileId )

      res.setHeader('Content-Type', 'text/plain; charset=GBK');
      res.download(filePath, fileId, function(err){
        if(err) {
          console.error(err)
          res.status(err.status).send(err.code) 
        }
        else{

          // Delete the file after download
          setTimeout(function(){

            fs.unlink(filePath, function(err, data){
              if(err) return console.error(err)
              console.log(filePath + " was unlinked")

            },60000) // end unlink

          }) // end setTimeout

        } // end else

      }) // end res.download
            
    },
    fetchHtml: function(req,res){
      var unmd = req.body.unmd
        , unhtml = req.body.unhtml
        , json_response = 
        {
          data: ''
        , error: false
        }

      // var html = _getHtml(req.body.unmd)  

      var name = _generateRandomMdFilename('html') 

      var filename = path.resolve(__dirname, '../../public/files/html/' + name )
      
      fs.writeFile( filename, unhtml, 'utf8', function(err, data){

        if(err){
          json_response.error = true
          json_response.data = "Something wrong with the markdown conversion."
          console.error(err)
          res.json( json_response )
        }
        else{
          json_response.data = name
          res.json( json_response )
         }
      }) // end writeFile
    },
    fetchHtmlDirect: function(req,res){
      var unmd = req.body.unmd,
      unhtml = req.body.unhtml
        , json_response = 
        {
          data: ''
        , error: false
        }
      json_response.data = unhtml
      res.json( json_response )
    },
    downloadHtml: function(req,res){
      
      var fileId = req.params.html

      var fileName = req.query.fileName;
      if (!fileName){
        fileName = fileId;
      }
      fileName = iconv.convert(fileName).toString('binary');
      var filePath = path.resolve(__dirname, '../../public/files/html/' + fileId )

      res.download(filePath, fileId, function(err){
        if(err) {
          console.error(err)
          res.status(err.status).send(err.code) 
        }
        else{

          // Delete the file after download
          setTimeout(function(){

            fs.unlink(filePath, function(err, data){
              if(err) return console.error(err)
              console.log(filePath + " was unlinked")

            },60000) // end unlink

          }) // end setTimeout

        } // end else

      }) // end res.download
      
    }
  }
  
})()
