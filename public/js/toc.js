(function(global, exports ) {
  function slugify(text) {
    return text.toLowerCase().replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
  };
  // TOC element description
  function TocElement(tagName, anchor, text) {
      this.tagName = tagName;
      this.anchor = anchor;
      this.text = text;
      this.children = [];
  }
  TocElement.prototype.childrenToString = function() {
      if(this.children.length === 0) {
          return "";
      }
      var result = "<ul>\n";
      _.each(this.children, function(child) {
          result += child.toString();
      });
      result += "</ul>\n";
      return result;
  };
  TocElement.prototype.toString = function() {
      var result = "<li>";
      if(this.anchor && this.text) {
          result += '<a href="#' + this.anchor + '">' + this.text + '</a>';
      }
      result += this.childrenToString() + "</li>\n";
      return result;
  };

  // Transform flat list of TocElement into a tree
  function groupTags(array, level) {
      level = level || 1;
      var tagName = "H" + level;
      var result = [];

      var currentElement = undefined;
      function pushCurrentElement() {
          if(currentElement !== undefined) {
              if(currentElement.children.length > 0) {
                  currentElement.children = groupTags(currentElement.children, level + 1);
              }
              result.push(currentElement);
          }
      }

      _.each(array, function(element, index) {
          if(element.tagName != tagName) {
              if(currentElement === undefined) {
                  currentElement = new TocElement();
              }
              currentElement.children.push(element);
          }
          else {
              pushCurrentElement();
              currentElement = element;
          }
      });
      pushCurrentElement();
      return result;
  }

  // Build the TOC
  function buildToc(previewContentsElt) {
      var anchorList = {};
      function createAnchor(element) {
          var id = element.id || slugify(element.textContent);
          var anchor = id;
          var index = 0;
          while (_.has(anchorList, anchor)) {
              anchor = id + "-" + (++index);
          }
          anchorList[anchor] = true;
          // Update the id of the element
          element.id = anchor;
          return anchor;
      }

      var elementList = [];
      _.each(previewContentsElt.find('h1,h2,h3,h4,h5,h6,h7'), function(elt) {
          elementList.push(new TocElement(elt.tagName, createAnchor(elt), elt.textContent));
      });
      elementList = groupTags(elementList);
      return '<div class="toc">\n<ul>\n' + elementList.join("") + '</ul>\n</div>\n';
  }
  var tocExp = new RegExp("^\\[(TOC|toc)\\]$", "g");
  global.TOC = {
    init: function(converter){
      converter.hooks.chain("postConversion", function(html){
        var $html = $('<div>'+html + '</div>');
        var htmlToc = buildToc($html);
        _.each($html.find('p'), function(elt){
          var $elt = $(elt);
          if(tocExp.test($elt.html())){
            $elt.html(htmlToc);
          }
        });
        return $html.html();
      });
    }

  };

}(this, (typeof module !== 'undefined' && module.exports ? module.exports : this)));
