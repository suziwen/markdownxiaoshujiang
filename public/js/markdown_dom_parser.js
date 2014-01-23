/*
 * HTMLParser - This implementation of parser assumes we are parsing HTML in browser
 * and user DOM methods available in browser for parsing HTML.
 *
 * @author Himanshu Gilani
 *
 */

/*
 Universal JavaScript Module, supports AMD (RequireJS), Node.js, and the browser.
 https://gist.github.com/kirel/1268753
*/

(function (name, definition) {
 // Browser
    var theModule = definition(), global = this, old = global[name];
    theModule.noConflict = function () {
      global[name] = old;
      return theModule;
    };
    global[name] = theModule;
})('markdownDOMParser', function() {

var HTMLParser = function (html, handler, opts) {
	opts = opts || {};

	var e = document.createElement('div');
	e.innerHTML = html;
	var node = e;
	var nodesToIgnore = opts['nodesToIgnore'] || [];
	var parseHiddenNodes = opts['parseHiddenNodes'] || 'false';

	var c = node.childNodes;
	for (var i = 0; i < c.length; i++) {
		try {
			var ignore = false;
			for (var k=0; k< nodesToIgnore.length; k++) {
				if (c[i].nodeName.toLowerCase() == nodesToIgnore[k]) {
					ignore= true;
					break;
				}
			}

			//NOTE hidden node testing is expensive in FF.
			if (ignore || (!parseHiddenNodes && isHiddenNode(c[i]))  ){
				continue;
			}

			if (c[i].nodeName.toLowerCase() != "#text" && c[i].nodeName.toLowerCase() != "#comment") {
				var attrs = [];

				if (c[i].hasAttributes()) {
					var attributes = c[i].attributes;
					for ( var a = 0; a < attributes.length; a++) {
						var attribute = attributes.item(a);

						attrs.push({
							name : attribute.nodeName,
							value : attribute.nodeValue,
						});
					}
				}

				if (handler.start) {
					if (c[i].hasChildNodes()) {
						handler.start(c[i].nodeName, attrs, false);

						//if (c[i].nodeName.toLowerCase() == "pre" || c[i].nodeName.toLowerCase() == "code") {
						//	handler.chars(c[i].innerHTML);
						//} else
						if (c[i].nodeName.toLowerCase() == "iframe" || c[i].nodeName.toLowerCase() == "frame") {
							if (c[i].contentDocument && c[i].contentDocument.documentElement) {
								return HTMLParser(c[i].contentDocument.documentElement, handler, opts);
							}
						} else {
							HTMLParser(c[i].innerHTML, handler, opts);
						}

						if (handler.end) {
							handler.end(c[i].nodeName);
						}
					} else {
						handler.start(c[i].nodeName, attrs, true);
					}
				}
			} else if (c[i].nodeName.toLowerCase() == "#text") {
				if (handler.chars) {
					handler.chars(c[i].nodeValue);
				}
			} else if (c[i].nodeName.toLowerCase() == "#comment") {
				if (handler.comment) {
					handler.comment(c[i].nodeValue);
				}
			}

		} catch (e) {
			//properly log error
			console.error(e);
			console.log("error while parsing node: " + c[i].nodeName.toLowerCase());
		}
	}
};

function isHiddenNode(node) {
	if (node.nodeName.toLowerCase() == "title"){
		return false;
	}

	if (window.getComputedStyle) {
		try {
			var style = window.getComputedStyle(node, null);
			if (style.getPropertyValue && style.getPropertyValue('display') == 'none') {
				return true;
			}
		} catch (e) {
			// consume and ignore. node styles are not accessible
		}
		return false;
	}
}

//http://blogs.msdn.com/b/aoakley/archive/2003/11/12/49645.aspx
function HTMLDecode(str) {
	var div = document.createElement('div');
	div.style.display="none";
	div.innerHTML = str;
	var decoded = div.firstChild.nodeValue;
	div.parentNode.removeChild(div);
	return decoded;
}

// HTMLEncode (@author Ulrich Jensen, http://www.htmlescape.net)
var hex = new Array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');

function HTMLEncode(originalText) {
	var preescape = "" + originalText;
	var escaped = "";

	var i = 0;
	for (i = 0; i < preescape.length; i++) {
		var p = preescape.charAt(i);

		p = "" + escapeCharOther(p);
		p = "" + escapeTags(p);
		p = "" + escapeBR(p);

		escaped = escaped + p;
	}
	return escaped;
}

function escapeHtmlTextArea(originalText) {
	var preescape = "" + originalText;
	var escaped = "";

	var i = 0;
	for (i = 0; i < preescape.length; i++) {
		var p = preescape.charAt(i);

		p = "" + escapeCharOther(p);
		p = "" + escapeTags(p);

		escaped = escaped + p;
	}

	return escaped;
}

function escapeBR(original) {
	var thechar = original.charCodeAt(0);

	switch (thechar) {
	case 10:
		return "<br/>";
		break; // newline
	case '\r':
		break;
	}
	return original;
}

function escapeNBSP(original) {
	var thechar = original.charCodeAt(0);
	switch (thechar) {
	case 32:
		return "&nbsp;";
		break; // space
	}
	return original;
}

function escapeTags(original) {
	var thechar = original.charCodeAt(0);
	switch (thechar) {
	case 60:
		return "&lt;";
		break; // <
	case 62:
		return "&gt;";
		break; // >
	case 34:
		return "&quot;";
		break; // "
	}
	return original;
}

function escapeCharOther(original) {
	var found = true;
	var thechar = original.charCodeAt(0);
	switch (thechar) {
	case 38:
		return "&amp;";
		break; // &
	case 198:
		return "&AElig;";
		break; // Æ
	case 193:
		return "&Aacute;";
		break; // Á
	case 194:
		return "&Acirc;";
		break; // Â
	case 192:
		return "&Agrave;";
		break; // À
	case 197:
		return "&Aring;";
		break; // Å
	case 195:
		return "&Atilde;";
		break; // Ã
	case 196:
		return "&Auml;";
		break; // Ä
	case 199:
		return "&Ccedil;";
		break; // Ç
	case 208:
		return "&ETH;";
		break; // Ð
	case 201:
		return "&Eacute;";
		break; // É
	case 202:
		return "&Ecirc;";
		break; // Ê
	case 200:
		return "&Egrave;";
		break; // È
	case 203:
		return "&Euml;";
		break; // Ë
	case 205:
		return "&Iacute;";
		break; // Í
	case 206:
		return "&Icirc;";
		break; // Î
	case 204:
		return "&Igrave;";
		break; // Ì
	case 207:
		return "&Iuml;";
		break; // Ï
	case 209:
		return "&Ntilde;";
		break; // Ñ
	case 211:
		return "&Oacute;";
		break; // Ó
	case 212:
		return "&Ocirc;";
		break; // Ô
	case 210:
		return "&Ograve;";
		break; // Ò
	case 216:
		return "&Oslash;";
		break; // Ø
	case 213:
		return "&Otilde;";
		break; // Õ
	case 214:
		return "&Ouml;";
		break; // Ö
	case 222:
		return "&THORN;";
		break; // Þ
	case 218:
		return "&Uacute;";
		break; // Ú
	case 219:
		return "&Ucirc;";
		break; // Û
	case 217:
		return "&Ugrave;";
		break; // Ù
	case 220:
		return "&Uuml;";
		break; // Ü
	case 221:
		return "&Yacute;";
		break; // Ý
	case 225:
		return "&aacute;";
		break; // á
	case 226:
		return "&acirc;";
		break; // â
	case 230:
		return "&aelig;";
		break; // æ
	case 224:
		return "&agrave;";
		break; // à
	case 229:
		return "&aring;";
		break; // å
	case 227:
		return "&atilde;";
		break; // ã
	case 228:
		return "&auml;";
		break; // ä
	case 231:
		return "&ccedil;";
		break; // ç
	case 233:
		return "&eacute;";
		break; // é
	case 234:
		return "&ecirc;";
		break; // ê
	case 232:
		return "&egrave;";
		break; // è
	case 240:
		return "&eth;";
		break; // ð
	case 235:
		return "&euml;";
		break; // ë
	case 237:
		return "&iacute;";
		break; // í
	case 238:
		return "&icirc;";
		break; // î
	case 236:
		return "&igrave;";
		break; // ì
	case 239:
		return "&iuml;";
		break; // ï
	case 241:
		return "&ntilde;";
		break; // ñ
	case 243:
		return "&oacute;";
		break; // ó
	case 244:
		return "&ocirc;";
		break; // ô
	case 242:
		return "&ograve;";
		break; // ò
	case 248:
		return "&oslash;";
		break; // ø
	case 245:
		return "&otilde;";
		break; // õ
	case 246:
		return "&ouml;";
		break; // ö
	case 223:
		return "&szlig;";
		break; // ß
	case 254:
		return "&thorn;";
		break; // þ
	case 250:
		return "&uacute;";
		break; // ú
	case 251:
		return "&ucirc;";
		break; // û
	case 249:
		return "&ugrave;";
		break; // ù
	case 252:
		return "&uuml;";
		break; // ü
	case 253:
		return "&yacute;";
		break; // ý
	case 255:
		return "&yuml;";
		break; // ÿ
	case 162:
		return "&cent;";
		break; // ¢
	default:
		found = false;
		break;
	}

	if (!found) {
		if (thechar > 127) {
			var c = thechar;
			var a4 = c % 16;
			c = Math.floor(c / 16);
			var a3 = c % 16;
			c = Math.floor(c / 16);
			var a2 = c % 16;
			c = Math.floor(c / 16);
			var a1 = c % 16;
			return "&#x" + hex[a1] + hex[a2] + hex[a3] + hex[a4] + ";";
		} else {
			return original;
		}
	}
}
return HTMLParser;
});
