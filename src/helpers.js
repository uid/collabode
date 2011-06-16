import("fastJSON");
import("comet");
import("jsutils.eachProperty");
import("utils.renderTemplateAsString");

import("globals.*");

var _UniqueArray = function() {
    this._a = [];
    this._m = {};
};
_UniqueArray.prototype.add = function(x) {
    if (!this._m[x]) {
        this._a.push(x);
        this._m[x] = true;
    }
};
_UniqueArray.prototype.asArray = function() {
    return this._a;
};

function _hd() {
    if (!appjet.requestCache.helperData) {
        appjet.requestCache.helperData = {
                clientVars: {},
                htmlTitle: "",
                headExtra: "",
                bodyId: "",
                bodyClasses: new _UniqueArray(),
                cssIncludes: new _UniqueArray(),
                jsIncludes: new _UniqueArray(),
                includeCometJs: false,
                suppressGA: false,
                showHeader: true,
                robotsPolicy: null
        };
    }
    return appjet.requestCache.helperData;
}

function addBodyClass(c) {
    _hd().bodyClasses.add(c);
}

function addClientVars(vars) {
    eachProperty(vars, function(k,v) {
        _hd().clientVars[k] = v;
    });
}

function addToHead(stuff) {
    _hd().headExtra += stuff;
}

function setHtmlTitle(t) {
    if (t instanceof Array) {
        t = t.join(' - ');
    }
    _hd().htmlTitle = t;
}

function setBodyId(id) {
    _hd().bodyId = id;
}

function includeJs(relpath) {
    _hd().jsIncludes.add(relpath);
}

function includeJQuery() {
    includeJs("jquery-1.6.1.min.js");
}

function includeCss(relpath) {
    _hd().cssIncludes.add(relpath);
}

function includeCometJs() {
    _hd().includeCometJs = true;
}

function hideHeader() {
    _hd().showHeader = false;
}

function bodyClasses() {
    return _hd().bodyClasses.asArray().join(' ');
}

function clientVarsScript() {
    var x = _hd().clientVars;
    x = fastJSON.stringify(x);
    if (x == '{}') {
        return '<!-- no client vars -->';
    }
    x = x.replace(/</g, '\\x3c');
    return [
            '<script type="text/javascript">',
            '  // <![CDATA[',
            'var clientVars = '+x+';',
            '  // ]]>',
            '</script>'
            ].join('\n');
}

function htmlTitle() {
    return _hd().htmlTitle;
}

function bodyId() {
    return _hd().bodyId;
}

function baseHref() {
    return request.scheme + "://"+ request.host + "/";
}

function headExtra() {
    return _hd().headExtra;
}

function jsIncludes() {
    /*
    if (isProduction()) {
        var jsincludes = _hd().jsIncludes.asArray();
        if (_hd().includeCometJs) {
            jsincludes.splice(0, 0, {
                getPath: function() { return 'comet-client.js'; },
                getContents: function() { return comet.clientCode(); },
                getMTime: function() { return comet.clientMTime(); }
            });
        }
        if (jsincludes.length < 1) { return ''; }
        var key = faststatic.getCompressedFilesKey('js', '/static/js', jsincludes);
        return '<script type="text/javascript" src="/static/compressed/'+key+'"></script>';
    } else {
     */
    var ts = +(new Date);
    var r = [];
    if (_hd().includeCometJs) {
        r.push('<script type="text/javascript" src="'+COMETPATH+'/js/client.js?'+ts+'"></script>');
    }
    _hd().jsIncludes.asArray().forEach(function(relpath) {
        r.push('<script type="text/javascript" src="/static/js/'+relpath+'?'+ts+'"></script>');
    });
    return r.join('\n');
    //}
}

function cssIncludes() {
    /*
    if (isProduction()) {
        var key = faststatic.getCompressedFilesKey('css', '/static/css', _hd().cssIncludes.asArray());
        return '<link href="/static/compressed/'+key+'" rel="stylesheet" type="text/css" />';
    } else {
     */
    var ts = +(new Date);
    var r = [];
    _hd().cssIncludes.asArray().forEach(function(relpath) {
        r.push('<link href="/static/css/'+relpath+'?'+ts+'" rel="stylesheet" type="text/css" />');
    });
    return r.join('\n');
    //}
}

function isHeaderVisible() {
    return _hd().showHeader;
}

function renderList(name, list, here, wrap) {
  if ( ! wrap) {
    wrap = { item: 'li', list: 'ul' };
  }
  var r = [];
  list.forEach(function(item) {
    if (item instanceof Array) {
      r.push(renderList(name, item, here, wrap))
    } else {
      r.push('<'+wrap.item+(item.equals(here) ? ' class="here">' : '>') + renderView(name, item) + '</'+wrap.item+'>');
    }
  });
  return '<'+wrap.list+'>' + r.join('\n') + '</'+wrap.list+'>';
}

function renderView(name, item) {
  return renderTemplateAsString(name + "/" + item.getClass().getSimpleName().toLowerCase() + ".ejs", {
    item: item
  });
}

function renderPartial(name, data) {
  return renderTemplateAsString(name + ".ejs", data);
}
