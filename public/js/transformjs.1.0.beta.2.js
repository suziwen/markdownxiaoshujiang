// Vector and Matrix mathematics modules for JavaScript
// Copyright (c) 2007 James Coglan
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

var Sylvester = {
  version: '0.1.3',
  precision: 1e-6
};

function Matrix() {}
Matrix.prototype = {

  // Returns element (i,j) of the matrix
  e: function(i,j) {
    if (i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) { return null; }
    return this.elements[i-1][j-1];
  },

  // Maps the matrix to another matrix (of the same dimensions) according to the given function
  map: function(fn) {
    var els = [], ni = this.elements.length, ki = ni, i, nj, kj = this.elements[0].length, j;
    do { i = ki - ni;
      nj = kj;
      els[i] = [];
      do { j = kj - nj;
        els[i][j] = fn(this.elements[i][j], i + 1, j + 1);
      } while (--nj);
    } while (--ni);
    return Matrix.create(els);
  },

  // Returns the result of multiplying the matrix from the right by the argument.
  // If the argument is a scalar then just multiply all the elements. If the argument is
  // a vector, a vector is returned, which saves you having to remember calling
  // col(1) on the result.
  multiply: function(matrix) {
    if (!matrix.elements) {
      return this.map(function(x) { return x * matrix; });
    }
    var returnVector = matrix.modulus ? true : false;
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.canMultiplyFromLeft(M)) { return null; }
    var ni = this.elements.length, ki = ni, i, nj, kj = M[0].length, j;
    var cols = this.elements[0].length, elements = [], sum, nc, c;
    do { i = ki - ni;
      elements[i] = [];
      nj = kj;
      do { j = kj - nj;
        sum = 0;
        nc = cols;
        do { c = cols - nc;
          sum += this.elements[i][c] * M[c][j];
        } while (--nc);
        elements[i][j] = sum;
      } while (--nj);
    } while (--ni);
    var M = Matrix.create(elements);
    return returnVector ? M.col(1) : M;
  },

  x: function(matrix) { return this.multiply(matrix); },
  
  // Returns true iff the matrix can multiply the argument from the left
  canMultiplyFromLeft: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    // this.columns should equal matrix.rows
    return (this.elements[0].length == M.length);
  },

  // Set the matrix's elements from an array. If the argument passed
  // is a vector, the resulting matrix will be a single column.
  setElements: function(els) {
    var i, elements = els.elements || els;
    if (typeof(elements[0][0]) != 'undefined') {
      var ni = elements.length, ki = ni, nj, kj, j;
      this.elements = [];
      do { i = ki - ni;
        nj = elements[i].length; kj = nj;
        this.elements[i] = [];
        do { j = kj - nj;
          this.elements[i][j] = elements[i][j];
        } while (--nj);
      } while(--ni);
      return this;
    }
    var n = elements.length, k = n;
    this.elements = [];
    do { i = k - n;
      this.elements.push([elements[i]]);
    } while (--n);
    return this;
  }
};

// Constructor function
Matrix.create = function(elements) {
  var M = new Matrix();
  return M.setElements(elements);
};

// Utility functions
$M = Matrix.create;
// ==========================================================================
// Project:  TransformJS        
// Copyright: ©2011 Strobe Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

(function($) {

  if ( !$.cssHooks ) {
    throw("jQuery 1.4.3+ is needed for this plugin to work");
    return;
  }
  
  var translationUnit = 'px'
  
  var prop = "transform",
      vendorProp, supportedProp, supports3d, supports2d, supportsFilter,
      
      // capitalize first character of the prop to test vendor prefix
      capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
      prefixes = [ "Moz", "Webkit", "O", "ms" ],
      div = document.createElement( "div" );

  if ( prop in div.style ) {

    // browser supports standard CSS property name
    supportedProp = prop;
    supports3d = div.style.perspective !== undefined;
  } 
  else {

    // otherwise test support for vendor-prefixed property names
    for ( var i = 0; i < prefixes.length; i++ ) {
      vendorProp = prefixes[i] + capProp;

      if ( vendorProp in div.style ) {
        supportedProp = vendorProp;
        if (prefixes[i] == 'ms') {
            translationUnit = ''
        }
        if((prefixes[i] + 'Perspective') in div.style) {
          supports3d = true;
        }
        else {
          supports2d = true;
        }
        break;
      }
    }
  }
  
  if (!supportedProp) {
    supportsFilter = ('filter' in div.style);
    supportedProp = 'filter';
  }

  // console.log('supportedProp: '+supportedProp+', 2d: '+supports2d+', 3d: '+supports3d+', filter: '+supportsFilter);

  // avoid memory leak in IE
  div = null;
  
  // add property to $.support so it can be accessed elsewhere
  $.support[ prop ] = supportedProp;
  
  var transformProperty = supportedProp;

  var properties = {
    rotateX: {
      defaultValue: 0,
      matrix: function(a) {
        if (supports3d) {
          return $M([
            [1,0,0,0],
            [0,Math.cos(a), Math.sin(-a), 0],
            [0,Math.sin(a), Math.cos( a), 0],
            [0,0,0,1]
          ]);          
        }
        else {
          return $M([
            [1, 0,0],
            [0, 1,0],
            [0,0,1]
          ]);               
        }
      }
    },
    rotateY: {
      defaultValue: 0,
      matrix: function(b) {
        if (supports3d) {
          return $M([
            [Math.cos( b), 0, Math.sin(b),0],
            [0,1,0,0],
            [Math.sin(-b), 0, Math.cos(b), 0],
            [0,0,0,1]
          ]);
        }
        else {
          return $M([
            [1, 0,0],
            [0, 1,0],
            [0,0,1]
          ]);               
        }
      }
    },
    rotateZ: {
      defaultValue: 0,
      matrix: function(c) {
        if (supports3d) {
          return $M([
            [Math.cos(c), Math.sin(-c), 0, 0],
            [Math.sin(c), Math.cos( c), 0, 0],
            [0,0,1,0],
            [0,0,0,1]
          ]);
        }
        else {
          return $M([
            [Math.cos(c), Math.sin(-c),0],
            [Math.sin(c), Math.cos( c),0],
            [0,0,1]
          ]);          
        }
      }
    },
    scale: {
      defaultValue: 1,
      matrix: function(s) {
        if (supports3d) {
          return $M([
            [s,0,0,0],
            [0,s,0,0],
            [0,0,s,0],
            [0,0,0,1]
          ]);
        }
        else {
          return $M([
            [s, 0,0],
            [0, s,0],
            [0,0,1]
          ]);               
        }
      }
    },
    translateX: {
      defaultValue: 0,
      matrix: function(tx) {
        if (supports3d) {
          return $M([
            [1,0,0,0],
            [0,1,0,0],
            [0,0,1,0],
            [tx,0,0,1]
          ]);
        }
        else {
          return $M([
            [1, 0,0],
            [0, 1,0],
            [tx,0,1]
          ]);               
        }
      }
    },
    translateY: {
      defaultValue: 0,
      matrix: function(ty) {
        if (supports3d) {
          return $M([
            [1,0,0,0],
            [0,1,0,0],
            [0,0,1,0],
            [0,ty,0,1]
          ]);
        }
        else {
          return $M([
            [1, 0,0],
            [0, 1,0],
            [0,ty,1]
          ]);               
        }
      }
    },
    translateZ: {
      defaultValue: 0,
      matrix: function(tz) {
        if (supports3d) {
          return $M([
            [1,0,0,0],
            [0,1,0,0],
            [0,0,1,0],
            [0,0,tz,1]
          ]);
        }
        else {
          return $M([
            [1, 0,0],
            [0, 1,0],
            [0,0,1]
          ]);               
        }
      }
    }
  };
  
  var applyMatrix = function(elem) {
      var transforms = $(elem).data('transforms');
      var tM;
      
      if (supports3d) {
        tM = $M([
          [1,0,0,0],
          [0,1,0,0],
          [0,0,1,0],
          [0,0,0,1]
        ]);
      }
      else {
        tM = $M([
          [1,0,0],
          [0,1,0],
          [0,0,1]
        ]);
      }

      for (var name in properties) {
        tM = tM.x(properties[name].matrix(transforms[name] || properties[name].defaultValue))
      }
      
      if (supports3d) {
        s  = "matrix3d(";
          s += tM.e(1,1).toFixed(10) + "," + tM.e(1,2).toFixed(10) + "," + tM.e(1,3).toFixed(10) + "," + tM.e(1,4).toFixed(10) + ",";
          s += tM.e(2,1).toFixed(10) + "," + tM.e(2,2).toFixed(10) + "," + tM.e(2,3).toFixed(10) + "," + tM.e(2,4).toFixed(10) + ",";
          s += tM.e(3,1).toFixed(10) + "," + tM.e(3,2).toFixed(10) + "," + tM.e(3,3).toFixed(10) + "," + tM.e(3,4).toFixed(10) + ",";
          s += tM.e(4,1).toFixed(10) + "," + tM.e(4,2).toFixed(10) + "," + tM.e(4,3).toFixed(10) + "," + tM.e(4,4).toFixed(10);
        s += ")";        
      }
      else if (supports2d) {
        s  = "matrix(";
          s += tM.e(1,1).toFixed(10) + "," + tM.e(1,2).toFixed(10) + ",";
          s += tM.e(2,1).toFixed(10) + "," + tM.e(2,2).toFixed(10) + ",";
          s += tM.e(3,1).toFixed(10) + translationUnit + "," + tM.e(3,2).toFixed(10) + translationUnit;
        s += ")";        
      }
      else if (supportsFilter) {
        s = "progid:DXImageTransform.Microsoft.";
			 	  s += "Matrix(";
            s += "M11="+tM.e(1,1).toFixed(10) + ",";
            s += "M12="+tM.e(1,2).toFixed(10) + ",";
            s += "M21="+tM.e(2,1).toFixed(10) + ",";
            s += "M22="+tM.e(2,2).toFixed(10) + ",";
            s += "SizingMethod='auto expand'";
          s += ")";
          
        elem.style.top = tM.e(3,1);
        elem.style.left = tM.e(3,2);
      }

      elem.style[transformProperty] = s;
  }
  
  var hookFor = function(name) {
    
    $.fx.step[name] = function(fx){
      $.cssHooks[name].set( fx.elem, fx.now + fx.unit );
    };
    
    return {
      get: function( elem, computed, extra ) {
        var transforms = $(elem).data('transforms');
        if (transforms === undefined) {
          transforms = {};
          $(elem).data('transforms',transforms);
        }
        
        return transforms[name] || properties[name].defaultValue;
      },
      set: function( elem, value) {
        var transforms = $(elem).data('transforms');
        if (transforms === undefined) transforms = {};
        var propInfo = properties[name];

        if (typeof propInfo.apply === 'function') {
          transforms[name] = propInfo.apply(transforms[name] || propInfo.defaultValue, value);
        } else {
          transforms[name] = value
        }
        
        $(elem).data('transforms',transforms);
        
        applyMatrix(elem);
      }
    }
  }

  if (transformProperty) {
    for (var name in properties) {
      $.cssHooks[name] = hookFor(name);
      $.cssNumber[name] = true;
    } 
  }

})(jQuery);
