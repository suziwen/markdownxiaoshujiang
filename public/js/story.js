$(function(){
  
  var editor
    , converter
    , autoInterval
    , profile = 
      {
        theme: 'ace/theme/clouds'
      , currentMd: ''
      ,viewMode: "viewMode-normal"
      ,keyBinding: "ace"
      ,showInvisibles: true
      ,showGutter: true
      , autosave: 
        {
          enabled: true
        , interval: 60000 // might be too aggressive; don't want to block UI for large saves.
        }
      , current_filename : '未命名文件'
      }
    ,keyBindings = 
      {
         ace: null
        ,vim: require("ace/keyboard/vim").handler
        ,emacs: "ace/keyboard/emacs"
      }
  var versionClient = null;

  // Feature detect ish
  var xiaoshujiang = 'xiaoshujiang'
    , xiaoshujiangElem = document.createElement(xiaoshujiang)
    , xiaoshujiangStyle = xiaoshujiangElem.style
    , domPrefixes = 'Webkit Moz O ms Khtml'.split(' ')
    
  // Cache some shit
  var $theme = $('#theme-list')
    , $preview = $('#preview')
    , $autosave = $('#autosave')

    
  // Hash of themes and their respective background colors
  var bgColors = 
    {
      'chrome': '#bbbbbb'
    , 'clouds': '#7AC9E3'
    , 'clouds_midnight': '#5F9EA0'
    , 'cobalt': '#4d586b'
    , 'crimson_editor': '#ffffff'
    , 'dawn': '#DADCAD'
    , 'eclipse': '#6C7B8A'
    , 'idle_fingers': '#DEB887'
    , 'kr_theme': '#434343'
    , 'merbivore': '#3E353E'
    , 'merbivore_soft': '#565156'
    , 'mono_industrial': '#C0C0C0'
    , 'monokai': '#F5DEB3'
    , 'pastel_on_dark': '#676565'
    , 'solarized-dark': '#0E4B5A'
    , 'solarized_light': '#dfcb96'
    , 'textmate': '#fff'
    , 'tomorrow': '#0e9211'
    , 'tomorrow_night': '#333536'
    , 'tomorrow_night_blue': '#3a4150'
    , 'tomorrow_night_bright': '#3A3A3A'
    , 'tomorrow_night_eighties': '#474646'
    , 'twilight': '#534746'
    , 'vibrant_ink': '#363636'
    }
    var editorWidgets = $('.markdown-editor-widget');

    function getScrollHeight($prevFrame) {
        // Different browsers attach the scrollHeight of a document to different
        // elements, so handle that here.
        if ($prevFrame[0].scrollHeight !== undefined) {
            return $prevFrame[0].scrollHeight;
        } else if ($prevFrame.find('html')[0].scrollHeight !== undefined &&
            $prevFrame.find('html')[0].scrollHeight !== 0) {
            return $prevFrame.find('html')[0].scrollHeight;
        } else {
            return $prevFrame.find('body')[0].scrollHeight;
        }
    }



    var editorWidget = editorWidgets;
    var editorElement = editorWidget.find('.ace_editor');
    var editorPanel = editorWidget.find('.editorPanel');
    var previewPanel = editorWidget.find(".previewPanel");
    $preview = editorWidget.find('.preview');
    var target = editorElement.attr('data-target');
    editor = ace.edit(editorElement[0].id);
    var isZenMode = 0;
    var viewMode = profile.viewMode; 
    var changed = false;
    editor.getSession().setUseSoftTabs(true);
    editor.setShowInvisibles(true);
    /**
     * This will probably be poorly performant as the input grows to move
     * the data on every keypress, a better solution could be to detect if
     * we are inside a form element and only serialize on submit.
     * */
    editor.getSession().on('change', function(){
        var value = editor.getSession().getValue();
        var childTextarea = $('#'+target);
        childTextarea.val(value);
        previewMd();
        changed = true;
    });
    window[target+'-editor'] = editor;

    function syncPreview() {
        var $ed = editor;
        var $prev = previewPanel;

        var editorScrollRange = ($ed.getSession().getLength());

        var previewScrollRange = (getScrollHeight($prev));

        // Find how far along the editor is (0 means it is scrolled to the top, 1
        // means it is at the bottom).
        var scrollFactor = $ed.getFirstVisibleRow() / editorScrollRange;

        // Set the scroll position of the preview pane to match.  jQuery will
        // gracefully handle out-of-bounds values.
        $prev.scrollTop(scrollFactor * previewScrollRange);
    }
    function updateStaticsCount(orignText){
        var text = $(orignText).text();
        var worldTotal = (text.match(new RegExp("\\S+", "g")) || []).length;
        var charTotal = (text.match(new RegExp("\\S", "g")) || []).length;
        var paragraphsTotal = (text.match(new RegExp("\\S.*", "g")) || []).length;

        $('#span-stat-value1').text("字符数：" + charTotal);
        $('#span-stat-value2').text("字数：" + worldTotal);
        $('#span-stat-value3').text("段落数：" + paragraphsTotal);
        return orignText;
    }
    editor.getSession().setUseWrapMode(true);

    converter = new Markdown.Converter();
    //converter = Markdown.getSanitizingConverter();
    // tell the converter to use Markdown Extra
    Markdown.Extra.init(converter, {
      extensions: ["tables", "fenced_code_gfm", "def_list", "attr_list", "footnotes", "smartypants", "newlines", "strikethrough", "smart_strong", "abbr"],
      table_class: "table table-striped",
      highlighter: "highlight"
    });
    TOC.init(converter);
    converter.hooks.chain("postConversion", updateStaticsCount);
    var result = converter.makeHtml(editor.getSession().getValue());

    var preview = $preview[0]
    var MathCache = (function(){
        var cache = {}
        var hit = []
        return {
          get : function(key){
            hit.push(key);
            return cache[key];
          },
          set : function(key, content){
            cache[key] = content;
            hit.push(key);
          },
          clean : function(){
            Object.keys(cache).filter(function(k){
              return hit.indexOf(k) < 0;
            }).map(function(k){
              console.log('cache clean', k )
              delete cache[k]
            });
            hit = []
          }
            

        }

    }())
    var previewTimeout = null;
    function previewMd(){
        if(!!previewTimeout){
          return;
        }
        previewTimeout = setTimeout(function(){
          _internalPreviewMd();
          previewTimeout = null;
        }, 1000);
    }
    function _internalPreviewMd(){
        var unmd = editor.getSession().getValue()
            , md = converter.makeHtml(unmd)

        $preview
            .html('') // unnecessary?
            .html(md);
        //$preview.find('pre>code').each(function(i, e) {hljs.highlightBlock(e)});
        $preview.find('code').map(function(k, item){
          var content = item.innerText;
          var match = content.match(/^\s*\$(.*?)\$\s*$/)
          if (match){
            $(item).addClass('language-mathjax inline').text(match[1]).wrap('<span class="inline-mathjax"></span>')
          }
        })

        $preview.find('pre, .inline-mathjax').map(function(k, item){
          var code_elem = $(item.childNodes[0]);

          if (window.MathJax && code_elem.is(".language-mathjax")){
            var content = code_elem.html();
            var hash = CryptoJS.MD5(content);
            var cache = MathCache.get(hash)
            var isInline = code_elem.is(".inline");
            var inline = isInline ? " style='display:inline-block;margin:0'" : " style='text-align: center;margin: 20px 0;'";
            var tag = isInline ? "span" : "div"
            var fill;
            if (cache){
              console.log('cache hit', hash)
              $(item).replaceWith("<" + tag + " class='mathjax'" + inline + ">" + cache + "</" + tag + ">")
            }else{
              console.log('cache nohit', hash, content);
              fill = $("<" + tag + " class='mathjax' " + inline + ">$#" + content  +  "#$</" + tag + ">")[0]

              MathJax.Hub.Queue(["Typeset",MathJax.Hub, fill]);
              MathJax.Hub.Queue(function(){
                var second = $(fill).children()[1];
                if (!second || second.innerText.length ==0 || $(second).is('.MathJax_Error')) return;
                $(fill).find('script').remove();
                $(fill).find('[id]').map(function(i, span){
                  $(span).removeAttr('id').removeAttr('class').removeAttr('role').removeAttr('aria-readonly');
                })
                $(fill).find('nobr').replaceWith(function(){
                  return $("<" + tag + " style='white-space: nowrap;'></" + tag + ">").append($(this).html().replace(/font-family: (.*?);/g, function(whole, part){ return  'font-family:' + part + ", serif;"} ));
                })
                MathCache.set(hash, fill.innerHTML);
                $(item).replaceWith(fill)
              })
              //MathJax.Hub.Queue(["Typeset",MathJax.Hub, a[0]]);
            }
          }else{
            hljs.highlightBlock(item)
          }
        })
        window.MathJax && MathJax.Hub.Queue(function(){
          MathCache.clean();
        })
    }
    $preview.html('').html(result);
    isLivePreview = 1;

    //resizePanels();
    function getPreviewHtml(){
      return $preview.html();
    }
    function resetViewMode(e, viewMode){
        e.removeClass( function(index, className){
            var classNames = className.split(' ');
            var willRemovedClassName = [];
            $.each(classNames, function(i, n){
                if(n.indexOf("viewMode")=== 0){
                    willRemovedClassName.push(n);
                }
            });
            return willRemovedClassName.join(' ');
        } );
        e.addClass(viewMode);
    }
    function removeSpanClassName(e){
        e.removeClass( function(index, className){
            var classNames = className.split(' ');
            var willRemovedClassName = [];
            $.each(classNames, function(i, n){
                if(n.indexOf("span")=== 0){
                    willRemovedClassName.push(n);
                }
            });
            return willRemovedClassName.join(' ');
        } );
    }
    function toggleZenMode(){
        var onString;
        if(isZenMode === 0){
            $(document.body).addClass("zen-mode");
            isZenMode = 1;
            updateUserProfile({'viewMode': "viewMode-editor"});
            onString = "开启";
	        Notifier.showMessage("开启写作模式，按esc键退出 ",1000);
        } else {
            isZenMode = 0;
            $(document.body).removeClass("zen-mode");
            updateUserProfile({'viewMode': "viewMode-normal"});
        }
        resizePanels();
        
    }

    function toggleVersionMode(){
       if(!!versionClient){
         versionClient.unLoad();
         versionClient = null;
       } else {
        var loadVersionContent = null;
        var initSelection = null;
        if (!!profile.relateType) {
          if(profile.relateType == 'evernote'){
            var versions = [];
            Evernote.listNoteVersions(profile.evernote.guid, function(noteVersionIds){
              $.each(noteVersionIds, function(i,v){
                versions.push({title: v.title, date: v.updated});
              }); 
              if(!$.isArray(versions) || versions.length <= 0){
                Notifier.showMessage("该文件暂时没有历史版本,或者您的笔记帐号还不支持历史版本功能，请升级到高级帐户", 9000, "warn");
                return ;
              }
              loadVersionContent = function(i, cb){
                var version = versions[i];
                var noteVersionId = version['title'];
                Evernote.getNoteVersion(profile.evernote.guid, noteVersionId, function(note){
                  cb(note.content);
                });
              }
              initSelection = function(e, cb){
                var pos = e.val();
                cb({id:pos, text: versions[pos].date});
              }
              updateUserProfile({'viewMode': "viewMode-normal"});
              resizePanels();
              versionClient = versionManager(editor, editorWidget, versions, loadVersionContent, initSelection);
              versionClient.load();
            });
          } 
        } else {
          if(!$.isArray(profile.versionMds) || profile.versionMds.length <= 0){
            Notifier.showMessage("该文件暂时没有历史版本", 9000, "warn");
            return ;
          }
          updateUserProfile({'viewMode': "viewMode-normal"});
          resizePanels();
          versionClient = versionManager(editor, editorWidget, profile.versionMds, loadVersionContent, initSelection);
          versionClient.load();
        }
       }
    }
    function versionManager(editor, target, versions, loadVersionContent, initSelection){
      var versionEditors = []; 
      var currentVersion = null;
      var $selectVersion = null;
      if(!loadVersionContent && !$.isFunction(loadVersionContent)){
        loadVersionContent = function(i, cb){
          var content = versions[i].content;
          cb(content);
        }
      }
      if (!$.isFunction(initSelection)){
        initSelection = function(e, cb){
          var pos = e.val();
          cb({id:pos, text: versions[pos].date});
        }
      }

      function destroySelectVersion(){
        $('.select-version>div').remove();
      }
      function initSelectVersion(){
        var data = [];
        $.each(versions, function(i, v){
          data.push({id: i, text:v.date});
        });
        var $select = $('<div></div>').appendTo($('.select-version'));
        $select.val(versions.length - 1 + "");
        return $select.select2({
          width: '150px',
          initSelection: initSelection, 
          data: data
        });
      }
      return {
        getCurrentVersion: function(){
          return versions[currentVersion];
        },
        unLoad: function(){
          var $body = $(document.body);
          $body.removeClass("version-mode");
          destroySelectVersion();
          target.find('.versionPanel').remove();
          versionEditors = [];
          currentVersion = null;
          editor.setReadOnly(false);
        },
        load: function(){
           var _self = this;
           editor.setReadOnly(true);
           if ($.isArray(versions)){
            var $body = $(document.body);
            $body.addClass("version-mode");
            currentVersion = versions.length - 1;
            $.each(versions, function(i, v){
              var $version = $('<div class="versionPanel"><div></div></div>').appendTo(editorWidget);
              versionEditors.push($version);
              if (versions.length - 1 -i > 3){
                $version.hide();
              }
              else if ((versions.length -1 -i >= 1) && (versions.length - 1 - i <=3)){
                $version.css({
                  scale: (1 - (versions.length - 1 - i) * 0.05),
                  translateY: -(versions.length - 1 - i) * 20,
                  opacity: (1 - (versions.length - 1 - i) * (1 / 3))
                });
                var $veditor = $version.children()
                var veditor = ace.edit($veditor[0]);
                veditor.getSession().setMode("ace/mode/markdown");
                veditor.getSession().setValue('');
                veditor.setTheme(profile.theme);
                veditor.setReadOnly(true);
              }else {
                $version.css({
                  scale: (1 - (versions.length - 1 - i) * 0.05),
                  translateY: -(versions.length - 1 - i) * 20,
                  opacity: (1 - (versions.length - 1 - i) * (1 / 3))
                });
                loadVersionContent(i, function(content){
                  var $veditor = $version.children()
                  var veditor = ace.edit($veditor[0]);
                  veditor.getSession().setMode("ace/mode/markdown");
                  veditor.getSession().setValue(content);
                  veditor.setTheme(profile.theme);
                  veditor.setReadOnly(true);
                });
              }
            });
            $selectVersion = initSelectVersion();
            $selectVersion.on('change', function(e){
               _self.selectVersion(e.val);
            });
          }
        },
        forwardVersion: function(){
          $selectVersion.select2("val", currentVersion + 1 + "", true); 
        },
        backwardVersion: function(){
          $selectVersion.select2("val", currentVersion - 1 + "", true);
        },
        selectVersion: function(i){
          var delta =i - currentVersion;
          this.goToVersion(delta); 
        },
        goToVersion: function(delta){
          if (versions === undefined || currentVersion === undefined || versionEditors.length === 0) {
                throw new Error("Trying to navigate in version history with no versions loaded.")
            }
            currentVersion += delta;
            if (currentVersion >= versions.length) {
                currentVersion = versions.length - 1;
            }
            if (currentVersion <= 0) {
                currentVersion = 0;
            }
            $.each(versions, function(i, version){
                var versionEditor = versionEditors[i]
                var hidden = false;
                var blank = false;
                if (currentVersion - i > 3) {
                    $(versionEditor).fadeOut()
                    hidden = true
                } else if (currentVersion - i < 0) {
                    $(versionEditor).fadeOut()
                    hidden = true
                } else {
                    $(versionEditor).fadeIn()
                }
                if (currentVersion -i >= 1 && currentVersion-i <=3){
                  blank = true;
                }
                if (hidden) {
                    $(versionEditor).animate({
                        scale: (1 - (currentVersion - i) * 0.05),
                        translateY: -(currentVersion - i) * 20,
                    }, {
                        queue: false
                    })
                } else {
                    if (blank){
                      var veditor = ace.edit(versionEditor.children()[0]);
                      veditor.getSession().setValue('');
                    } else {
                      loadVersionContent(i, function(content){
                        var veditor = ace.edit(versionEditor.children()[0]);
                        veditor.getSession().setValue(content);
                      });
                    }
                    $(versionEditor).animate({
                        scale: (1 - (currentVersion - i) * 0.05),
                        translateY: -(currentVersion - i) * 20,
                        opacity: (1 - (currentVersion - i) * (1 / 3))
                    }, {
                        queue: false
                    })
                }
             });
          },
          revert: function(){
            var _self = this;
            var versionEditor = versionEditors[currentVersion];
            versionEditor[0].style.zIndex = 100;
            versionEditor.animate({
              left: '5%',
              top: '50px',
              bottom: '50px',
              right: '52.5%'
            }, 1000, function(){
              var content = versions[currentVersion].content;
              editor.getSession().setValue(content);
              versionEditor.hide();
              _self.unLoad();
            });
          }
       }
    }

    function resizePanels() {
        resetViewMode(editorWidget, profile.viewMode);
        editor.resize();
    }
    
    function toggleNormalMode(){
      if(isZenMode === 0){
	if (profile.viewMode === "viewMode-editor") {
          updateUserProfile({'viewMode': "viewMode-normal"});
	  } else if (profile.viewMode == "viewMode-normal") {
          updateUserProfile({'viewMode': "viewMode-preview"});
	  } else if (profile.viewMode == "viewMode-preview") {
          updateUserProfile({'viewMode': "viewMode-editor"});
	  } else {
          updateUserProfile({'viewMode': "viewMode-normal"});
	  }
	  resizePanels();
      }
    }

    var ctrlKey = (navigator.appVersion.indexOf("Mac") == -1) ? "ctrl" : "⌘";
    jwerty.key('ctrl+shift+1', function() {
        toggleNormalMode();
    });
    jwerty.key('esc', function() {
      if (!!versionClient){
        toggleVersionMode();
      }
    });
    /**
     * Bind synchronization of preview div to editor scroll and change
     * of editor cursor position.
     */
    editor.session.on('changeScrollTop', syncPreview);
    editor.session.selection.on('changeCursor', syncPreview);
     
      
  /// UTILS =================
  

  /**
   * Utility method to async load a JavaScript file.
   *
   * @param {String} The name of the file to load
   * @param {Function} Optional callback to be executed after the script loads.
   * @return {void}
   */
  function asyncLoad(filename,cb){
    (function(d,t){

      var leScript = d.createElement(t)
        , scripts = d.getElementsByTagName(t)[0]
      
      leScript.async = 1
      leScript.src = filename
      scripts.parentNode.insertBefore(leScript,scripts)

      leScript.onload = function(){
        cb && cb()
      }

    }(document,'script'))
  }
  
  /**
   * Utility method to determin if localStorage is supported or not.
   *
   * @return {Boolean}
   */
  function hasLocalStorage(){
   // http://mathiasbynens.be/notes/localstorage-pattern  
   var storage
   try{ if(localStorage.getItem) {storage = localStorage} }catch(e){}
   return storage
  }

  /**
   * Grab the user's profile from localStorage and stash in "profile" variable.
   *
   * @return {Void}
   */
  function getUserProfile(){
    
    var p
    
    try{
      p = JSON.parse( localStorage.xiaoshujiangprofile )
      // Need to merge in any undefined/new properties from last release 
      // Meaning, if we add new features they may not have them in profile
      p = $.extend(true, profile, p)
    }catch(e){
      p = profile
    }

    profile = p
    
    // console.dir(profile)
  }
  
  /**
   * Update user's profile in localStorage by merging in current profile with passed in param.
   *
   * @param {Object}  An object containg proper keys and values to be JSON.stringify'd
   * @return {Void}
   */
  function updateUserProfile(obj){
    localStorage.clear()
    localStorage.xiaoshujiangprofile = JSON.stringify( $.extend(true, profile, obj) )
  }

  /**
   * Utility method to test if particular property is supported by the browser or not.
   * Completely ripped from Modernizr with some mods. 
   * Thx, Modernizr team! 
   *
   * @param {String}  The property to test
   * @return {Boolean}
   */
  function prefixed(prop){ return testPropsAll(prop, 'pfx') }

  /**
   * A generic CSS / DOM property test; if a browser supports
   * a certain property, it won't return undefined for it.
   * A supported CSS property returns empty string when its not yet set.
   *
   * @param  {Object}  A hash of properties to test
   * @param  {String}  A prefix
   * @return {Boolean}
   */
  function testProps( props, prefixed ) {
      
      for ( var i in props ) {
        
          if( xiaoshujiangStyle[ props[i] ] !== undefined ) {
              return prefixed === 'pfx' ? props[i] : true
          }
      
      }
      return false
  }

  /**
   * Tests a list of DOM properties we want to check against.
   * We specify literally ALL possible (known and/or likely) properties on
   * the element including the non-vendor prefixed one, for forward-
   * compatibility.
   *
   * @param  {String}  The name of the property
   * @param  {String}  The prefix string
   * @return {Boolean} 
   */
  function testPropsAll( prop, prefixed ) {

      var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1)
        , props   = (prop + ' ' + domPrefixes.join(ucProp + ' ') + ucProp).split(' ')

      return testProps(props, prefixed)
  }
  
  /**
   * Normalize the transitionEnd event across browsers.
   *
   * @return {String} 
   */
  function normalizeTransitionEnd()
  {

    var transEndEventNames = 
      {
        'WebkitTransition' : 'webkitTransitionEnd'
      , 'MozTransition'    : 'transitionend'
      , 'OTransition'      : 'oTransitionEnd'
      , 'msTransition'     : 'msTransitionEnd' // maybe?
      , 'transition'       : 'transitionend'
      }

     return transEndEventNames[ prefixed('transition') ]
  }


  /**
   * Generate a random filename.
   *
   * @param  {String}  The file type's extension
   * @return {String} 
   */
  function generateRandomFilename(ext){
    return 'xiaoshujiang_' +(new Date()).toISOString().replace(/[\.:-]/g, "_")+ '.' + ext
  }


  /**
   * Get current filename from contenteditable field.
   *
   * @return {String} 
   */
  function getCurrentFilenameFromField(){
    return $('#filename').val()
  }


  /**
   * Set current filename from profile.
   *
   * @param {String}  Optional string to force set the value. 
   * @return {String} 
   */
  function setCurrentFilenameField(str){
    $('#filename').val( str || profile.current_filename || "未命名文件")
  }


  /**
   * Initialize application.
   *
   * @return {Void}
   */
  function init(){

    if( !hasLocalStorage() ) { sadPanda() }
    else{
      
      // Attach to jQuery support object for later use.
      $.support.transitionEnd = normalizeTransitionEnd()
      
      getUserProfile()

      initUi()
      // 取消异步加载，因为现在打算用离线应用
      //initMathjax()
      // converter = new Showdown.converter()
      
      // bindPreview()

      bindNav()
      
      bindKeyboard()
      
      bindDelegation()
      initdragFilesSupport()
      autoSave()
      if (screenfull.enabled) {
          document.addEventListener(screenfull.raw.fullscreenchange, function () {
              if (!screenfull.isFullscreen){
                isZenMode = 1;
                toggleZenMode();
              } else {
                isZenMode = 0;
                toggleZenMode();
              }
          });
      }
      
    }

  }


  /**
   * 异步加载mathjax库，加载功能后重新更新预览页面
   */
  function initMathjax(){
    $.getScript('http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML', function(){
          previewMd();
          Notifier.showMessage('加载Mathjax成功，现在可以使用mathjax语法进行公式的编辑');
        });
  }

  /**
   * Initialize various UI elements based on userprofile data.
   *
   * @return {Void}
   */
  function initUi(){
    
    // Set proper theme value in theme dropdown
    fetchTheme(profile.theme, function(){
      $theme.find('li > a[data-value="'+profile.theme+'"]').addClass('selected')
      
      editor.getSession().setUseWrapMode(true)
      editor.setShowPrintMargin(false)

      editor.setFontSize(15);
      editor.getSession().setMode('ace/mode/markdown')
      editor.setKeyboardHandler(keyBindings[profile.keyBinding]);
      editor.renderer.setShowGutter(profile.showGutter);
      editor.setShowInvisibles(profile.showInvisibles);

      editor.getSession().setValue( profile.currentMd || editor.getSession().getValue())
      
      // Immediately populate the preview <div>
      previewMd()
      
      editorPanel.bind($.support.transitionEnd, function(){
        resizePanels();
      });
    
      var settingContainer = $('#modal-setting');
      var $keyBindings = settingContainer.find('#keyBindings');
      $keyBindings.find('option[value="' + profile.keyBinding + '"]' ).prop('selected', true);
      $keyBindings.on('change', function(event){
        var value = $keyBindings.find('option:selected').val();
        editor.setKeyboardHandler(keyBindings[value]);
        updateUserProfile({keyBinding: value});
        Notifier.showMessage("键盘模式修改成功：" + value)
      });
      var $showGutter = settingContainer.find('#showGutter');
      $showGutter.prop('checked', profile.showGutter);
      $showGutter.on('change', function(event){
        var checked = $showGutter.prop('checked');
        editor.renderer.setShowGutter(checked);
        updateUserProfile({showGutter: checked});
        Notifier.showMessage(checked?"打开显示行号":"关闭显示行号")
      });
      var $showInvisibles = settingContainer.find('#showInvisibles');
      $showInvisibles.prop('checked', profile.showInvisibles);
      $showInvisibles.on('change', function(event){
        var checked = $showInvisibles.prop('checked');
        editor.setShowInvisibles(checked);
        updateUserProfile({showInvisibles: checked});
        Notifier.showMessage(checked?"打开显示隐藏元素":"关闭显示隐藏元素")
      });
    })
    
    
    // Set text for dis/enable autosave
    $autosave.html( profile.autosave.enabled ? '<i class="icon-remove"></i>&nbsp;禁止自动保存' : '<i class="icon-ok"></i>&nbsp;启动自动保存' )
    
    setCurrentFilenameField()
    
    /* BEGIN RE-ARCH STUFF */

    $('.dropdown-toggle').dropdown()
    
    /* END RE-ARCH STUFF */
    
  }


  /// HANDLERS =================

  
  /**
   * Clear the markdown and text and the subsequent HTML preview.
   *
   * @return {Void}
   */
  function clearSelection(){
    editor.getSession().setValue("")
    previewMd()    
  }

  // TODO: WEBSOCKET MESSAGE?
  /**
   * Save the markdown via localStorage - isManual is from a click or key event.
   *
   * @param {Boolean} 
   * @return {Void}
   */
  function saveFile(isManual){
    if (changed || isManual){
      var mdContent = editor.getSession().getValue(); 
      updateUserProfile({currentMd: mdContent})
      if(!!isManual){
        if(!!profile.relateType){
          if (profile.relateType == 'evernote'){
            Evernote.putMarkdownFile(profile.evernote.guid, profile.current_filename, profile.evernote.format, profile.evernote.notebook_guid, false)
          } 
        } else {
          Notifier.showMessage(Notifier.messages.docSavedLocal)
        }
      }
      addVersion(mdContent);
      changed = false;
    }
  }

  function addVersion(mdContent){
    var mds = profile.versionMds;
    if (!mds){
      mds = []
    }
    if (mds.length >= 5){
      mds.shift()
    }
    mds.push({
      title: profile.current_filename,
      content: mdContent,
      date: new Date().toLocaleDateString()
    });
    updateUserProfile({versionMds: mds})
  }
  
  /**
   * Enable autosave for a specific interval.
   *
   * @return {Void}
   */
  function autoSave(){

    if(profile.autosave.enabled){
      autoInterval = setInterval( function(){
        // firefox barfs if I don't pass in anon func to setTimeout.
        if (changed){
          saveFile()
        }
      }, profile.autosave.interval)
      
    }
    else{
      clearInterval( autoInterval )
    }

  }


  function newMdFile(){
    updateUserProfile({
      currentMd: '',
      versionMds: [],
      current_filename: ''
    });
    setCurrentFilenameField();
    editor.getSession().setValue('');
  }
  
  /**
   * Clear out user profile data in localStorage.
   *
   * @return {Void}
   */
  function resetProfile(){
    // For some reason, clear() is not working in Chrome.
    localStorage.clear()
    // Let's turn off autosave
    profile.autosave.enabled = false
    // Delete the property altogether --> need ; for JSHint bug.
    ; delete localStorage.xiaoshujiangprofile
    // Now reload the page to start fresh
    window.location.reload()
//    Notifier.showMessage(Notifier.messages.profileCleared, 1400)
  }

  /**
   * Dropbown nav handler to update the current theme.
   *
   * @return {Void}
   */  
   function changeTheme(e){
     // check for same theme
     var $target = $(e.target)
     if( $target.attr('data-value') === profile.theme) { return }
     else{
       // add/remove class
       $theme.find('li > a.selected').removeClass('selected')
       $target.addClass('selected')
       // grabnew theme
       var newTheme = $target.attr('data-value')
       $(e.target).blur()
       fetchTheme(newTheme, function(){
         Notifier.showMessage(Notifier.messages.profileUpdated)
       })
      }
   }  
  
  // TODO: Maybe we just load them all once and stash in appcache?
  /**
   * Dynamically appends a script tag with the proper theme and then applies that theme.
   *
   * @param {String}  The theme name
   * @param {Function}   Optional callback
   * @return {Void}
   */  
  function fetchTheme(th, cb){
    var name = th.split('/').pop()

    asyncLoad("/js/ace/theme-"+ name +".js", function(){

      editor.setTheme(th)

      cb && cb()
      
      updateBg(name)
      
      updateUserProfile({theme: th})
    
    }) // end asyncLoad

  } // end fetchTheme(t)
  
  /**
   * Change the body background color based on theme.
   *
   * @param {String}  The theme name
   * @return {Void}
   */  
  function updateBg(name){
    document.body.style.backgroundColor = bgColors[name]
  }
  

  /**
   * Stash current file name in the user's profile.
   *
   * @param {String}  Optional string to force the value
   * @return {Void}
   */  
  function updateFilename(str){
    // Check for string because it may be keyup event object
    var f
    if(typeof str === 'string'){
      f = str
    }else
    {
      f = getCurrentFilenameFromField()
    }
    updateUserProfile( {current_filename: f })
  }
  
  function fetchMarkdownFile(){
    var unmd = editor.getSession().getValue();

    var blob = new Blob([unmd], {type:'text/plain;charset=utf-8'});
    saveAs(blob, profile.current_filename);
  }

  function fetchHtmlFile(){
    
    var unmd = editor.getSession().getValue()
    var unhtml = getPreviewHtml();
    var blob = new Blob([unhtml], {type:'text/html;charset=utf-8'});
    saveAs(blob, profile.current_filename);
  }

  function showHtml(){
    var unhtml = getPreviewHtml();
    $('#myModalBody').text(unhtml);
    $('#myModal').modal({
      keyboard: false,
      backdrop: 'static',
      show: true
    });
  }

  function showSetting(){
    var container = $('#modal-setting');
    container.modal({
      keyboard: false,
      backdrop: 'static',
      show: true
    })
  }

  /**
   * Show a sad panda because they are using a shitty browser. 
   *
   * @return {Void}
   */  
  function sadPanda(){
    // TODO: ACTUALLY SHOW A SAD PANDA.
    alert('Sad Panda - No localStorage for you!')
  }
/** start diff **/
  function diffUsingJS (text1,text2,viewType) {
      var base = difflib.stringAsLines(text1);
      var newtxt = difflib.stringAsLines(text2);
      var sm = new difflib.SequenceMatcher(base, newtxt);
      var opcodes = sm.get_opcodes();
      contextSize =  null;
      result = diffview.buildView({ baseTextLines:base,
          newTextLines:newtxt,
          opcodes:opcodes,
          baseTextName:"Base Text",
          newTextName:"New Text",
          contextSize:contextSize,
          viewType:   viewType });
      return result;
  }

  function prettyformat(text1,text2) {
      var dmp = new diff_match_patch();
      var d = dmp.diff_main(text1, text2);
      dmp.diff_cleanupSemantic(d);
      var ds = dmp.diff_prettyHtml(d);
      return ds;

  }


/** end diff **/

  function showDiff(text1, text2){
    resetModal();
    var diffBtns = '<div class="btn-group nav-tabs" data-toggle="buttons-radio">'+
        '<button class="btn" display-type="sidebyside">比较</button>' +
        '<button class="btn" display-type="inside">单行</button>' +
        '<button class="btn" display-type="pretty">可读</button>' +
        '</div>';
    var $diffBtns = $(diffBtns).appendTo('.modal-footer');
    $diffBtns.find("button").on('click',function(e){
        var display_type = $(this).attr("display-type");
        ds = '';
        switch (display_type) {
            case "sidebyside":ds = diffUsingJS(text1,text2,0);break;
            case "inside" :ds = diffUsingJS(text1,text2,1);break;
            case "pretty" :ds = prettyformat(text1,text2);break;
            default :ds = diffUsingJS(text1,text2,0);break;
        }
        $(".modal-body").html(ds);
    });
    $diffBtns.find('button').first().trigger('click');
    $('.modal-header .header-title').text('文件差异比较');
    $('#modal-generic').modal({
      keyboard: false,
      backdrop: 'static',
      show: true
    });
  }

  /**
   * Show the modal for the "About Xiaoshujiang" information.
   *
   * @return {Void}
   */  
  function showAboutInfo(){

    resetModal();
    $('.modal-header .header-title').text("小书匠markdown编辑器")

    // TODO: PULL THIS OUT AND RENDER VIA TEMPLATE FROM XHR OR STASH IN PAGE FOR SEO AND CLONE
    var aboutContent =  "<p>感谢您使用小书匠版的markdown在线编辑器</p>"
                      + "<p>本makrdown编辑器是与小书匠网独立开来的一个软件，方便用户直接使用</p>"
                      + "<p>如果您想将文档保存到服务器上，可以先注册我们小书匠网的帐号，然后在小书匠网上进行编辑文件</p>"
  
    $('.modal-body').html(aboutContent)

    $('#modal-generic').modal({
      keyboard: false,
      backdrop: 'static',
      show: true
    })
    
  }
  

  
  
  /// UI RELATED =================
  
  /**
   * Toggles the autosave feature. 
   *
   * @return {Void}
   */  
  function toggleAutoSave(){

    $autosave.html( profile.autosave.enabled ? '<i class="icon-remove"></i>&nbsp;禁止自动保存' : '<i class="icon-ok"></i>&nbsp;启动自动保存' )

    updateUserProfile({autosave: {enabled: !profile.autosave.enabled }})

    autoSave()
  
  }
  
  /**
   * Bind navigation elements.
   *
   * @return {Void}
   */  
  function bindNav(){
    
    $theme
      .find('li > a')
      .bind('click', function(e){
        changeTheme(e)
        return false
      })

    $('#clear')
      .on('click', function(){
        clearSelection()
        return false
      })
    $("#update_evernote")
      .on('click', function(){
      profile.current_filename = profile.current_filename || generateRandomFilename('md');

      Evernote.updateEvernoteModal();
      //Evernote.putMarkdownFile()

      saveFile();
      
      return false;
    })
    $("#saveas_evernote").on('click', function(){
      profile.current_filename = profile.current_filename || generateRandomFilename('md');
      Evernote.saveasEvernoteModal();
      saveFile();
      return false;
    });

    $("#autosave")
      .on('click', function(){
        toggleAutoSave()
        return false
    })

    $("#new_md").on('click', function(){
      newMdFile();
    });
    
    $("#save_md").on('click', function(){
      saveFile(true); 
    });

    $('#import_evernote')
      .on('click', function(){
        Evernote.importEvernoteModal()
        return false
      })
    
    $('#export_md')
      .on('click', function(){
        fetchMarkdownFile()
        $('.dropdown').removeClass('open')
        return false
      })

    $('#export_html')
      .on('click', function(){
        fetchHtmlFile()
        $('.dropdown').removeClass('open')
        return false
      })

    $('#show_html')
      .on('click', function(){
        showHtml()
        $('.dropdown').removeClass('open')
        return false
      })


    $('#setting').
      on('click', function(){
        showSetting();
        return false;
      })

    $('#about').
      on('click', function(){
        showAboutInfo()
        return false
      })

    $('#cheat').
      on('click', function(){
        window.open("http://www.xiaoshujiang.com/szw_2003/xiaoshujiangmanual/blob/master/%E5%B8%AE%E5%8A%A9/009MARKDOWN%E8%AF%AD%E6%B3%95", "_blank")
        return false
      })
      
      $('#preview-mode').on('click', function(){
	toggleNormalMode();
      });
    $('#writing-mode').on('click', function(){
      if (screenfull.enabled){
        screenfull.toggle();
      } else {
        toggleZenMode();
      }
      });
     $('#version-mode').on('click', function(){
       toggleVersionMode();
     });

    if (!!profile.relateType){
      $('#unrelated-button').show();
    }
    $('.toggle-bind').on('click', function(){
      if($(this).find('>i.icon-minus').length > 0){
        updateUserProfile({relateType:null});
        $('#unrelated-button').hide();
      }
    })
    $('#unrelated-button').on('click', function(){
      updateUserProfile({relateType:null});
      $(this).hide();
    });

     $('.done').on('click', function(){
      toggleVersionMode();
     });

     $('.forward').on('click', function(){
       versionClient.forwardVersion();
     });
     $('.backward').on('click', function(){
       versionClient.backwardVersion();
     });
     $('.revert').on('click', function(){
       versionClient.revert();
     });
     $('.diff').on('click', function(){
       var source = editor.getSession().getValue();
       var target = versionClient.getCurrentVersion().content;
       showDiff(source, target); 
     });
    $('#filename').bind('keyup', updateFilename)
  } // end bindNav()

  /**
   * Bind special keyboard handlers.
   *
   * @return {Void}
   */  
  function bindKeyboard(){
    // CMD+s TO SAVE DOC
    jwerty.key('command+s, ctrl+s', function(e){
     saveFile(true)
     e.preventDefault() // so we don't save the webpage - native browser functionality
    })
    
    var saveCommand = {
       name: "save",
       bindKey: {
                mac: "Command-S",
                win: "Ctrl-S"
              },
       exec: function(){ 
         saveFile(true) 
       }
    }
    var fileForUrlNamer = {
       name: "filenamer",
       bindKey: {
                mac: "Command-Shift-M",
                win: "Ctrl-Shift-M"
              },
       exec: function(){ 
        var profile = JSON.parse(localStorage.xiaoshujiangprofile);
        alert( profile.current_filename.replace(/\s/g, '-').toLowerCase())
      }
    }

    editor.commands.addCommand(saveCommand)
    editor.commands.addCommand(fileForUrlNamer)
  }

  /**
   * Bind dynamically added elements' handlers.
   *
   * @return {Void}
   */  
  function bindDelegation(){
    $(document)
      .on('click', '.evernote_note_selectable', function(){
        var self = $(this);
        var target = self.parents('.modal-body');
        target.find('ul.nav li.active').removeClass('active');
        self.parent('li').addClass('active');
      })
      .on('click', '.evernote_notebook_clickable_for_fetch', function(){
        var self = $(this);
        var name = self.text()
        var li = self.parent('li');
        var notebook_guid = li.attr('data-guid');
        var count = li.attr('data-count'); 
        Evernote.listNotesForFetch(notebook_guid, name, '', 0, count);
      })
      .on('click', '.evernote_notebook_clickable_for_update', function(){
        var self = $(this);
        var name = self.text()
        var li = self.parent('li');
        var notebook_guid = li.attr('data-guid');
        var count = li.attr('data-count'); 
        Evernote.listNotesForUpdate(notebook_guid, name, '', 0, count);
      })
      .on('click', '.evernote_notebook_selectable', function(){
        var self = $(this);
        var target = self.parents('.modal-body');
        target.find('ul.nav li.active').removeClass('active');
        self.parent('li').addClass('active');
      })
      // Check for support of drag/drop
      if('draggable' in document.createElement('span')){
        $('#editor')
          .on('dragover', function (e) {
            e.preventDefault()
            e.stopPropagation()
          })
          .on('drop', function(e) {
            e.preventDefault()
            e.stopPropagation()

            // fetch FileList object
            var originalEvent = e.originalEvent
                , files = originalEvent.target.files || originalEvent.dataTransfer.files
                , reader = new FileReader()
                , i = 0
                , file
                , name

            // find the first text file
            do {
              file = files[i++]
            } while (file && file.type.substr(0, 4) !== 'text' && file.name.substr(file.name.length - 3) !== '.md')

            if (!file) return

            reader.onload = function (lE) {
              editor.getSession().setValue(lE.target.result)
              previewMd()
            }
            reader.readAsText(file)
          })
      } // end if draggable 

  } // end bindDelegation()

  // start bind dragdrop
    function initdragFilesSupport(){

        // Check for support of drag/drop
        if('draggable' in document.createElement('span')){
            editorElement
                .on('dragover', function (e) {
                    e.preventDefault()
                    e.stopPropagation()
                })
                .on('drop', function(e) {
                    e.preventDefault()
                    e.stopPropagation()

                    // fetch FileList object
                    var originalEvent = e.originalEvent
                        , files = originalEvent.target.files || originalEvent.dataTransfer.files
                        , reader = new FileReader()
                        , i = 0
                        , file
                        , name

                    // find the first text file
                    do {
                        file = files[i++]
                    } while (file && file.type.substr(0, 4) !== 'text' && file.name.substr(file.name.length - 3) !== '.md'&& file.name.substr(file.name.length - 5) !== '.html')

                    if (!file) return

                    reader.onload = function (lE) {
                        if(file.type == 'text/html'){
                            editor.getSession().setValue(html2markdown(lE.target.result));
                        } else {
                            editor.getSession().setValue(lE.target.result);
                        }

                    }
                    reader.readAsText(file)
                })
        } // end if draggable
    }
  // end bind dragdrop

  /// MODULES =================


  // Notification Module
  var Notifier = (function(){
    
    var _el = $('.notifications')      
    
      return {
        messages: {
          profileUpdated: "设置修改成功"
          , profileCleared: "设置清除成功"
          , docSavedLocal: "文件成功保存到本地"
          , docSavedServer: "文件成功保存到服务器"
          , docSavedEvernote: "文件成功保存到服务器"
        },
        showMessage: function(msg,delay, type){
	      _el
      .notify($.extend({}, {
	fadeOut: {
	  enabled: true,
	  delay: delay || 1000
	}
      },{
        message: {
          text: msg
	},
        type:type|| 'info'
      })).show();

          } // end showMesssage
      } // end return obj
  })() // end IIFE

  function resetModal(){
    $('.modal-header .header-title').empty();
    $('.modal-body').empty();
    $('.modal-footer').empty();
  }
  // Evernote Module
  var Evernote = (function(){
    
    function _resetModal(container){
      container.find('.modal-header .header-title').empty();
      container.find('.modal-body').empty();
      container.find('.modal-footer').empty();
    }
    // Sorting regardless of upper/lowercase
    function _alphaNumSort(m,n) {
      var a = m.name.toLowerCase()
      var b = n.name.toLowerCase()
      if (a === b) { return 0 }
      if (isNaN(m) || isNaN(n)){ return ( a > b ? 1 : -1)} 
      else {return m-n}
    }
    
     function _listNotes(container, guid, notebookname, resp){
      var list = '<ul class="nav nav-list">'
      if(!resp.totalNotes){
        Notifier.showMessage('没有笔记');
        list += '没有笔记';
      } else {
        var notes = resp.notes;
        notes.forEach(function(item){
          // var name = item.path.split('/').pop()
          list += '<li data-guid="' 
                + item.guid + '"><a class="evernote_note_selectable" href="javascript:void(0);"><i class="icon-file"></i>' 
                + item.title + '</a></li>'
        })
      }
      list += '</ul>'
  
      container.find('.modal-header .header-title').html('<span class="label label-info">'  + notebookname + '</span> 下的笔记')
      
      container.find('.modal-body').html(list)
  
      return false
  
    }
     function _listClickableNotebooksForUpdate(container, notebooks, collectionCounts){

      var list = '<ul class="nav nav-list">'
      
      // Sort alpha
      notebooks.sort(_alphaNumSort)

      notebooks.forEach(function(item){
        // var name = item.path.split('/').pop()
        var count = _getNotebooksCount(item.guid, collectionCounts);
        var displayCount = '';
        if (!!count && count != 0 && count != 10000){
          displayCount = '( '+ count +' )';
        }
        list += '<li data-guid="' 
              + item.guid + '" data-count="' 
              + count + '"><a class="evernote_notebook_clickable_for_update" href="javascript:void(0);"><i class="icon-book"></i>' 
              + item.name  + displayCount + '</a></li>'
      })

      list += '</ul>'
  
      container.find('.modal-header .header-title').text('你的笔记本')
      
      container.find('.modal-body').html(list)
  
      return false
  
    }
     function _listClickableNotebooksForFetch(container, notebooks, collectionCounts){

      var list = '<ul class="nav nav-list">'
      
      // Sort alpha
      notebooks.sort(_alphaNumSort)

      notebooks.forEach(function(item){
        // var name = item.path.split('/').pop()
        var count = _getNotebooksCount(item.guid, collectionCounts);
        var displayCount = '';
        if (!!count && count != 0 && count != 10000){
          displayCount = '( '+ count +' )';
        }
        list += '<li data-guid="' 
              + item.guid + '" data-count="' 
              + count + '"><a class="evernote_notebook_clickable_for_fetch" href="javascript:void(0);"><i class="icon-book"></i>' 
              + item.name  + displayCount + '</a></li>'
      })

      list += '</ul>'
  
      container.find('.modal-header .header-title').text('你的笔记本')
      
      container.find('.modal-body').html(list)
  
      return false
  
    }
     function _getNotebooksCount(notebookGuid, collectionCounts){
       if(!!collectionCounts && !!collectionCounts.notebookCounts){
         return collectionCounts.notebookCounts[notebookGuid];
       } else {
         return 10000;
       }
     }
     function _listSelectableNotebooks(container, notebooks, collectionCounts){

      var list = '<ul class="nav nav-list">'
      
      // Sort alpha
      notebooks.sort(_alphaNumSort)

      notebooks.forEach(function(item){
        // var name = item.path.split('/').pop()
        var count = _getNotebooksCount(item.guid, collectionCounts);
        var displayCount = '';
        if (!!count && count != 0 && count != 10000){
          displayCount = '( '+ count +' )';
        }
        list += '<li data-guid="' 
              + item.guid + '" data-count="' 
              + count + '"><a class="evernote_notebook_selectable" href="javascript:void(0);"><i class="icon-book"></i>' 
              + item.name + '</a></li>'
      })

      list += '</ul>'
  
      container.find('.modal-header .header-title').text('请选择要保存到的位置')
      
      container.find('.modal-body').html(list)
  
      return false
  
    }
   
    var _hideLoading = function(container){
      container.find('.modal-body').removeClass('hide');
      container.find('.loading').addClass('hide');
    };
    var _showLoading = function(container){
      container.find('.modal-body').addClass('hide');
      container.find('.loading').removeClass('hide');
    }
     var _generateFormatSelect = function(defaultFormat){
      var html_checked = '';
      var markdown_checked = '';
      if (defaultFormat == 'markdown'){
        markdown_checked = 'checked="checked"';
      } else {
        html_checked = 'checked="checked"';
      }
      var format_str = '<div class="form-inline pull-left">\n';
      format_str += '<span>格式：</span>\n';
      format_str += '<label class="radio">\n';
      format_str += '  <input type="radio" name="format"value="html" '+ html_checked +'>html</label>\n';
      format_str += '<label class="radio">\n';
      format_str += '    <input type="radio" name="format" value="markdown" ' + markdown_checked  + '>markdown</label>\n';
      format_str += '</div>';
      return format_str;
    }

    var _generateReateCheck = function(){
      var relate_str = '<div class="form-inline pull-left">\n';
      relate_str += '<span>&nbsp;&nbsp;自动关联：</span>\n';
      relate_str += '<label class="checkbox">\n';
      relate_str += '<input type="checkbox" name ="relate" value="relate" checked="checked"></label>\n';
      relate_str += '</div>';
      return relate_str;
    }
 
    var _showFetchBtn = function(container){
      var footer = container.find('.modal-footer');
      var notebooksBtn = $('<button class="btn">返回</button>');
      var fetchBtn = $('<button class="btn btn-primary">选择</button>');
      footer.append(_generateFormatSelect('markdown'));
      footer.append(_generateReateCheck());
      footer.append(notebooksBtn).append(fetchBtn);
      notebooksBtn.on('click', function(){
        Evernote.importEvernoteModal();
      });
      fetchBtn.on('click', function(){
        var selectedli = container.find('ul.nav li.active');
        if (selectedli.length ==1) {
          var format = 'markdown';
          var needrelated = false;
          var formatinput = container.find('input[name="format"]:checked');
          var needrelateinput = container.find('input[name="relate"]:checked');
          if(needrelateinput.length >=1 ){
            needrelated = true;
          }
          if (formatinput.length == 1) {
            format = formatinput.val()
          }
          var note_guid = selectedli.attr('data-guid');
          var note_title = selectedli.text();
          profile.current_filename = note_title;
          Evernote.setFilePath(note_guid);
          Evernote.fetchNote(note_guid, format, needrelated);
        }else if (selectedli.length > 1){
          Notifier.showMessage('一次只能加载一个笔记');
        } else {
          Notifier.showMessage('请先选择一个笔记');
        }
      });
    }
    var _showSaveasBtn = function(container){
      var footer = container.find('.modal-footer');
      var saveasBtn = $('<button class="btn btn-primary">选择</button>');
      footer.append(_generateFormatSelect('markdown'));
      footer.append(_generateReateCheck());
      footer.append(saveasBtn);;
      saveasBtn.on('click', function(){
        var selectedli = container.find('ul.nav li.active');
        if (selectedli.length ==1) {
          var format = 'markdown';
          var formatinput = container.find('input[name="format"]:checked');
          if (formatinput.length == 1) {
            format = formatinput.val()
          }
          var needrelated = false;
          var needrelateinput = container.find('input[name="relate"]:checked');
          if(needrelateinput.length >=1 ){
            needrelated = true;
          }
          var notebook_guid = selectedli.attr('data-guid');
          Evernote.putMarkdownFile(null, null, format, notebook_guid, needrelated)
        }else if (selectedli.length > 1){
          Notifier.showMessage('只能选择一个笔记本');
        } else {
          Notifier.showMessage('请先选择一个笔记本');
        }
      });
    }

    var _showUpdateBtn = function(container){
      var footer = container.find('.modal-footer');
      var notebooksBtn = $('<button class="btn">返回</button>');
      var updateBtn = $('<button class="btn btn-primary">选择</button>');
      footer.append(_generateFormatSelect('markdown'));
      footer.append(_generateReateCheck());
      footer.append(notebooksBtn).append(updateBtn);;
      notebooksBtn.on('click', function(){
        Evernote.updateEvernoteModal();
      });
      updateBtn.on('click', function(){
        var selectedli = container.find('ul.nav li.active');
        if (selectedli.length ==1) {
          var format = 'markdown';
          var formatinput = container.find('input[name="format"]:checked');
          if (formatinput.length == 1) {
            format = formatinput.val()
          }
          var needrelated = false;
          var needrelateinput = container.find('input[name="relate"]:checked');
          if(needrelateinput.length >=1 ){
            needrelated = true;
          }
          var note_guid = selectedli.attr('data-guid');
          var note_title = selectedli.text();
          Evernote.putMarkdownFile(note_guid, note_title, format, null, needrelated)
        }else if (selectedli.length > 1){
          Notifier.showMessage('一次只能加载一个笔记');
        } else {
          Notifier.showMessage('请先选择一个笔记');
        }
      });
    }
    var _checkResponseErrorCode = function (resp){
      if(!!resp.errorCode){
        if (resp.errorCode == 9 ){
          Notifier.showMessage("证书过期，请断开连接后重新认证", 4000, 'error');
        } else {
          Notifier.showMessage("连接出现异常:" + resp.parameter, 4000, 'error');
        }
        return false;
      } else {
        return true;
      }
    }
    var _relateService = function (needrelated, relateType){
      if(!!needrelated){
        updateUserProfile({relateType:relateType});
        $('#unrelated-button').show();
      } else {
        updateUserProfile({relateType:null});
        $('#unrelated-button').hide();
      }
    }
    return {
      fetchAccountInfo: function(){

        function _beforeSendHandler(){
          Notifier.showMessage('从服务器上抓取用户信息')
        }

        function _doneHandler(a, b, response){
          var resp = JSON.parse(response.responseText)
          // console.log('\nFetch User Info...')
          // console.dir(resp)
          Notifier
            .showMessage('Sup '+ resp.display_name)
        } // end done handler

        function _failHandler(){
          alert("Roh-roh. Something went wrong. :(")
        }

        var config = {
                        type: 'GET',
                        dataType: 'json',
                        url: '/account/evernote',
                        beforeSend: _beforeSendHandler,
                        error: _failHandler,
                        success: _doneHandler
                      }

        $.ajax(config)  

      }, // end fetchAccuntInfo()
      fetchMetadata: function(){

        function _beforeSendHandler(){
          Notifier.showMessage('抓取元数据')
        }

        function _doneHandler(a, b, response){
          var resp = JSON.parse(response.responseText)
          window.console && window.console.log && console.dir(resp)
        } // end done handler

        function _failHandler(){
          alert("系统出现错误. :(")
        }

        var config = {
                        type: 'GET',
                        dataType: 'json',
                        url: '/evernote/metadata',
                        beforeSend: _beforeSendHandler,
                        error: _failHandler,
                        success: _doneHandler
                      }

        $.ajax(config)  

      }, // end fetchMetadata()

      importEvernoteModal: function(){
        this.listNotebooks(function(container, notebooks, collectionCounts, resp){
          _listClickableNotebooksForFetch(container, notebooks, collectionCounts, resp);
        });
      },
      updateEvernoteModal: function(){
        this.listNotebooks(function(container, notebooks, collectionCounts, resp){
          _listClickableNotebooksForUpdate(container, notebooks, collectionCounts, resp);
        });
      },
      saveasEvernoteModal: function(){
        this.listNotebooks(function(container, notebooks, collectionCounts, resp){
          _listSelectableNotebooks(container, notebooks, collectionCounts, resp);
          _showSaveasBtn(container);
        });
      },
      listNotebooks: function(cb){
        $('#modal-generic').modal({
          keyboard: false,
          backdrop: 'static',
          show: true
        });
        var container = $('#modal-generic');
        _showLoading(container);
        _resetModal(container);
        function _beforeSendHandler(){
          Notifier.showMessage('加载笔记本')
        }

        function _doneHandler(a, b, response){
          
          a = b = null
          _hideLoading(container);
          var resp = JSON.parse(response.responseText)
          if (!_checkResponseErrorCode(resp)){
            return false;
          } 
          if(!resp.notebooks.length){
            Notifier.showMessage('没有笔记本')
          }
          else{
            // console.dir(resp)
            if (!!cb){
              cb(container, resp.notebooks, resp.collectionCounts, resp);
            }
          }
        } // end done handler

        function _failHandler(resp,err){
          _hideLoading(container);
          alert(resp.responseText || "系统出现错误:(")
        }

        var config = {
                        type: 'GET',
                        dataType: 'json',
                        url: '/import/evernote/notebooks',
                        beforeSend: _beforeSendHandler,
                        error: _failHandler,
                        success: _doneHandler
                      }

        $.ajax(config)  

      }, 

      listNotesForFetch: function(guid, notebookname, query_str, offset, page_size){
        this.listNotes(guid, notebookname, query_str, offset, page_size, function(container, guid, notebookname, resp){
          _listNotes(container, guid, notebookname, resp);
          _showFetchBtn(container);
        });
      },

      listNotesForUpdate: function(guid, notebookname, query_str, offset, page_size){
        this.listNotes(guid, notebookname, query_str, offset, page_size, function(container, guid, notebookname, resp){
          _listNotes(container, guid, notebookname, resp);
          _showUpdateBtn(container);
        });
      },

      listNotes: function(guid, notebookname, query_str, offset, page_size, cb){

        var container = $('#modal-generic');
        _showLoading(container);
        _resetModal(container);
        function _beforeSendHandler(){
          Notifier.showMessage('加载笔记本：'+ notebookname);
        }

        function _doneHandler(a, b, response){
          
          a = b = null

          _hideLoading(container);
          var resp = JSON.parse(response.responseText)
          if (!_checkResponseErrorCode(resp)){
            return false;
          } 
          // console.dir(resp)
          if (!!cb ){
            cb(container, guid, notebookname, resp)
          }
        } // end done handler

        function _failHandler(resp,err){
          _hideLoading(container);
          alert(resp.responseText || "系统出现错误:(")
        }

        data = {guid: guid, words: query_str, offset: offset, page_size: page_size};
        var config = {
                        type: 'GET',
                        dataType: 'json',
                        data: data,
                        url: '/import/evernote/notes',
                        beforeSend: _beforeSendHandler,
                        error: _failHandler,
                        success: _doneHandler
                      }

        $.ajax(config)  

      }, 

      fetchNote: function(guid, format, needrelated){

        var container = $('#modal-generic');
        _showLoading(container);
        _resetModal(container);
        function _doneHandler(a, b, response){
          _hideLoading(container);
          response = JSON.parse(response.responseText)
          if (!_checkResponseErrorCode(response)){
            return false;
          } 
          // console.dir(response)
          if( response.statusCode === 404 ) {

            var msg = JSON.parse( response.data )

            Notifier.showMessage(msg.error)

          }
          else{
            
            $('#modal-generic').modal('hide');
            
            // Update it in localStorage
            updateFilename(response.title);
            // Show it in the field
            setCurrentFilenameField();
            profile.evernote.guid = response.guid ;
            profile.evernote.notebook_guid = response.notebookGuid;
            profile.evernote.format = format; 
            _relateService(needrelated, 'evernote');
            editor.getSession().setValue( response.content )
            previewMd()
            
          } // end else
        } // end done handler

        function _failHandler(){
          _hideLoading(container);
          alert("系统出现错误. :(")
        }

        var config = {
                        type: 'POST',
                        dataType: 'json',
                        data: 'guid=' + guid +'&format='+format,
                        url: '/fetch/evernote',
                        error: _failHandler,
                        success: _doneHandler
                      }

        $.ajax(config)  

      }, // end fetchMarkdownFile()
      listNoteVersions: function(guid, cb){
        var container = $('#modal-generic');
        container.modal({
          keyboard: false,
          backdrop: 'static',
          show: true
        });
        _showLoading(container);
        _resetModal(container);
        function _doneHandler(a, b, response){
          _hideLoading(container);
          container.modal('hide');
          response = JSON.parse(response.responseText)
          if (!_checkResponseErrorCode(response)){
            return false;
          } 
          // console.dir(response)
          if( response.statusCode === 404 ) {

            var msg = JSON.parse( response.data )

            Notifier.showMessage(msg.error)

          }
          else{
           cb(response); 
          } // end else
        } // end done handler

        function _failHandler(){
          _hideLoading(container);
          alert("系统出现错误. :(")
        }

        var config = {
                        dataType: 'json',
                        data: 'guid=' + guid,
                        url: '/list/evernote/versions',
                        error: _failHandler,
                        success: _doneHandler
                      }
        $.ajax(config)
     },
      getNoteVersion: function(guid, noteVersionId, cb){
        function _doneHandler(a, b, response){
          response = JSON.parse(response.responseText)
          if (!_checkResponseErrorCode(response)){
            return false;
          } 
          // console.dir(response)
          if( response.statusCode === 404 ) {

            var msg = JSON.parse( response.data )

            Notifier.showMessage(msg.error)

          }
          else{
           cb(response); 
          } // end else
        } // end done handler

        function _failHandler(){
          Notifier.showMessage("系统出现错误. :(")
        }

        var config = {
                        dataType: 'json',
                        data: 'guid=' + guid +'&noteVersionId=' + noteVersionId,
                        url: '/get/evernote/version',
                        error: _failHandler,
                        success: _doneHandler
                      }
        $.ajax(config)     
      },
      setFilePath: function(guid){
        updateUserProfile({evernote: {guid: guid }})
      },
      putMarkdownFile: function(guid, title, format, notebook_guid, needrelated){
        var container = $('#modal-generic');
        container.modal({
          keyboard: false,
          backdrop: 'static',
          show: true
        });
        _showLoading(container);
        _resetModal(container);
        function _doneHandler(a, b, response){
          a = b = null
          response = JSON.parse(response.responseText)
          if (!_checkResponseErrorCode(response)){
            return false;
          } 
          // console.dir(response)
          $('#modal-generic').modal('hide')
          if( response.statusCode >= 204 ) {

            var msg = JSON.parse( response.data )

            Notifier.showMessage(msg.error, 5000)

          }
          else{
            
            
            // console.dir(JSON.parse(response.data))

            if (!!needrelated){
              profile.evernote.guid = response.guid ;
              profile.evernote.notebook_guid = response.notebookGuid;
              profile.evernote.format = format; 
              _relateService(needrelated, 'evernote');
            }
            Notifier.showMessage( Notifier.messages.docSavedEvernote )
            
          } // end else
        } // end done handler

        function _failHandler(){
          $('#modal-generic').modal('hide')
          alert("系统出现异常 :(")
        }

        var md = encodeURIComponent( editor.getSession().getValue() )
        
        var unhtml = encodeURIComponent(getPreviewHtml());
        var postData = 'fileContents=' + md + '&fileHtmlContents=' + unhtml;
        if (!!guid){
          postData = postData + "&guid=" + guid;
        }
        if(!!notebook_guid){
          postData = postData + '&notebook_guid=' + notebook_guid;
        }
        if (!title){
          title = profile.current_filename
        }
        if(!format){
          format = 'markdown';
        }
        postData = postData + "&title=" + encodeURIComponent(title) +"&format="+ format;
        var config = {
                        type: 'POST',
                        dataType: 'json',
                        data: postData,
                        url: '/save/evernote',
                        error: _failHandler,
                        success: _doneHandler
                      }

        $.ajax(config)  

      } // end fetchMarkdownFile()
    } // end return obj
  })(); // end IIFE

  init()
    resizePanels();
})

window.onload = function(){
  $('#bdshare').hide();
  var $loading = $('#loading');
  var animationTime = 1000;
  var progressBar = $loading.find('.progress>.bar');
  progressBar.bind($.support.transitionEnd, function(){
    $(this).parent().removeClass('progress-striped active');
    $(this).parent().animate({
        top: "0%",
        left: "0%",
        width: "100%",
        height: "100%",
        margin: "0"
    }, 500, function () {
        $loading.fadeOut(500, function () {
            $('#main').removeClass('bye')
            $(this).remove();
            $('#bdshare').show();
        })
    });
  }).css({
    "width": "100%"
  });
  hljs.initHighlightingOnLoad();
  $('#unrelated-button').tooltip();
  $('#version-mode').tooltip();
  $('#preview-mode').tooltip();
  $('#writing-mode').tooltip();
}
