/*
 * ! Math.uuid.js (v1.4) http://www.broofa.com mailto:robert@broofa.com
 *
 * Copyright (c) 2010 Robert Kieffer Dual licensed under the MIT and GPL
 * licenses.
 */

/*
 * Generate a random uuid.
 *
 * USAGE: Math.uuid(length, radix) length - the desired number of characters
 * radix - the number of allowable values for each character.
 *
 * EXAMPLES: // No arguments - returns RFC4122, version 4 ID >>> Math.uuid()
 * "92329D39-6F5C-4520-ABFC-AAB64544E172" // One argument - returns ID of the
 * specified length >>> Math.uuid(15) // 15 character ID (default base=62)
 * "VcydxgltxrVZSTV" // Two arguments - returns ID of the specified length, and
 * radix. (Radix must be <= 62) >>> Math.uuid(8, 2) // 8 character ID (base=2)
 * "01001010" >>> Math.uuid(8, 10) // 8 character ID (base=10) "47473046" >>>
 * Math.uuid(8, 16) // 8 character ID (base=16) "098F4D35"
 */
(function () {
    // Private array of chars to use
    var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

    Math.uuid = function (len, radix) {
        var chars = CHARS, uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
        } else {
            // rfc4122, version 4 form
            var r;

            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            // Fill in random data. At i==19 set the high bits of clock sequence
            // as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }

        return uuid.join('');
    };

    // A more performant, but slightly bulkier, RFC4122v4 solution. We boost
    // performance
    // by minimizing calls to random()
    Math.uuidFast = function () {
        var chars = CHARS, uuid = new Array(36), rnd = 0, r;
        for (var i = 0; i < 36; i++) {
            if (i == 8 || i == 13 || i == 18 || i == 23) {
                uuid[i] = '-';
            } else if (i == 14) {
                uuid[i] = '4';
            } else {
                if (rnd <= 0x02) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
                r = rnd & 0xf;
                rnd = rnd >> 4;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
        return uuid.join('');
    };

    // A more compact, but less performant, RFC4122v4 solution:
    Math.uuidCompact = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
})();


if(!String.prototype.startsWith){
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

/**
 * Util
 *
 * @constructor
 */
function Util() {
}

/**
 * Function Logger
 *
 * @constructor
 */
var Logger = function (tag) {
    var self = this;

    var LogLevel = {
        TRACE: 0,
        DEBUG: 1,
        INFO: 2,
        WARN: 3,
        ERROR: 4,
        FATAL: 5
    }

    var LogLevelName = [
        'TRACE',
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'FATAL'
    ]

    this._log = function () {
        var level = arguments[0];

        level = arguments[0] = LogLevelName[level];

        emedia._logContext && sdklog.apply(null, arguments);
        if(emedia.config.consoleLogger !== true){
            return;
        }

        if(emedia && emedia.isElectron){
            console.log.apply(console, arguments);
            return;
        }
        if(console && level){
            (console[level.toLowerCase()] || console.warn).apply(console, arguments);
        }
    };

    function callLog(level, args) {
        try{
            _callLog(level, args);
        }catch(e){
            if(console){
                if(console.error) {
                    console.error(e);
                    return;
                }
                if(console.log) {
                    console.log(e);
                    return;
                }
            }

            throw e;
        }
    }


    function _sdklog() {
        if(emedia._logContextIndex < 0){
            return;
        }
        if(!emedia._logContext || !(emedia._logContext instanceof Array)){
            return;
        }

        var contextIndex = emedia._logContextIndex % emedia._logContext.length;
        var logInfos = emedia._logContext[contextIndex];
        if(!logInfos || !(logInfos instanceof Array)){
            logInfos = emedia._logContext[contextIndex] = [];
        }

        var info = [];
        info.push(emedia._logContextIndex);

        var now = new Date();
        if(now.toJSON){
            info.push(now.toJSON());
        }else if (now.toISOString){
            info.push(now.toISOString());
        }else{
            info.push(now + "");
        }


        for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i];

            if(typeof arg === "string"){
                info.push(arg);
                continue;
            }

            if(typeof arg.message === "string"){
                info.push(arg.message);
                continue;
            }
            if(typeof arg.message === "function"){
                info.push(arg.message());
                continue;
            }
            if(typeof arg.stack === "string"){
                info.push(arg.stack);
                continue;
            }
            if(arg.event && typeof arg.event.toString === "function"){
                info.push(arg.event.toString());
                continue;
            }
            if(arg.event && typeof arg.event.toString === "function"){
                info.push(arg.event.toString());
                continue;
            }

            if(typeof arg.candidate === "string"){
                info.push(arg.candidate);
                continue;
            }
            if(typeof arg.sdp === "string"){
                info.push(arg.sdp);
                continue;
            }

            arg && info.push(JSON.stringify(arg));
        }

        logInfos.push(info.join(' '));
    };

    function sdklog() {
        try{
            _sdklog.apply(null, arguments);
        }catch(e){
        }
    };

    function _callLog(level, args) {
        if(emedia && emedia.LOG_LEVEL && (level < emedia.LOG_LEVEL)){
            return;
        }

        var _args = [];

        _args.push(level);
        tag && _args.push(tag);

        for (var i = 0; i < args.length; i++) {
            _args.push(args[i] && args[i]._toString ? args[i]._toString.call(args[i]) : args[i]);
        }

        //_args.caller && _args.push(_args.caller);

        self._log.apply(self, _args);
    };

    this.log = function () {
        this._log && callLog(LogLevel.INFO, arguments)
    };

    this.trace = function () {
        this._log && callLog(LogLevel.TRACE, arguments)
    };

    this.debug = function () {
        this._log && callLog(LogLevel.DEBUG, arguments)
    };

    this.info = function () {
        this._log && callLog(LogLevel.INFO, arguments)
    };

    this.warn = function () {
        this._log && callLog(LogLevel.WARN, arguments)
    };

    this.error = function () {
        this._log && callLog(LogLevel.ERROR, arguments)
    };

    this.fatal = function () {
        this._log && callLog(LogLevel.FATAL, arguments)
    };
}

Logger.prototype.count = function(){
    if(emedia._logContext){
        emedia._logContextIndex++;

        var contextIndex = emedia._logContextIndex % emedia._logContext.length;

        if(contextIndex === 0 && emedia._logContextIndex !== 0){
            emedia._logContext.loadlogs = emedia._logContext[contextIndex];
        }
        emedia._logContext[contextIndex] = [];
    }
}

Util.prototype.logger = new Logger();

Util.prototype.tagLogger = function (tag) {
    return new Logger(tag);
}

/**
 * parse json
 *
 * @param jsonString
 */
Util.prototype.parseJSON = function (jsonString) {
    return JSON.parse(jsonString);
};

/**
 * json to string
 *
 * @type {Util.stringifyJSON}
 */
var stringifyJSON = Util.prototype.stringifyJSON = function (jsonObj) {
    return JSON.stringify(jsonObj);
};


var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call(Object);

/**
 * check object type
 *
 * @type {Util.isPlainObject}
 */
var isPlainObject = Util.prototype.isPlainObject = function (obj) {
    var proto, Ctor;

    // Detect obvious negatives
    // Use toString instead of jQuery.type to catch host objects
    var objectString;
    if (!obj
        || (objectString = toString.call(obj)) !== "[object Object]"
        || (obj.toString() === "<JSAPI-Auto Javascript Object>")
        || (obj.toString() === "[object IFBComJavascriptObject]")) {
        return false;
    }

    proto = Object.getPrototypeOf(obj);

    // Objects with no prototype (e.g., `Object.create( null )`) are plain
    if (!proto) {
        return true;
    }

    // Objects with prototype are plain iff they were constructed by a
    // global Object function
    Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
    return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
};

Util.prototype.isArray = Array.isArray;

/**
 * check empty object
 *
 * @param obj
 * @returns {boolean}
 */
Util.prototype.isEmptyObject = function (obj) {
    var name;
    for (name in obj) {
        return false;
    }
    return true;
};

Util.prototype.type = function (obj) {
    if (obj == null) {
        return obj + "";
    }
    return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
};

/**
 * Function extend
 *
 * @returns {*|{}}
 */
Util.prototype.extend = function () {
    var self = this;
    var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if (typeof target === "boolean") {
        deep = target;

        // Skip the boolean and the target
        target = arguments[i] || {};
        i++;
    }

    // Handle case when target is a string or something (possible in deep
    // copy)
    if (typeof target !== "object" && !self.isFunction(target)) {
        target = {};
    }

    // Extend self itself if only one argument is passed
    if (i === length) {
        target = this;
        i--;
    }

    for (; i < length; i++) {

        // Only deal with non-null/undefined values
        if (( options = arguments[i] ) != null) {

            // Extend the base object
            for (name in options) {
                src = target[name];
                copy = options[name];

                // Prevent never-ending loop
                if (target === copy) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if (deep && copy && ( self.isPlainObject(copy) ||
                    ( copyIsArray = self.isArray(copy) ) )) {

                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && self.isArray(src) ? src : [];

                    } else {
                        clone = src && self.isPlainObject(src) ? src : {};
                    }

                    // Never move original objects, clone them
                    target[name] = self.extend(deep, clone, copy);

                    // Don't bring in undefined values
                } else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
}

Util.prototype.removeAttribute = function (elem, key) {
    if(elem === null || elem === undefined){
        return;
    }

    var obj = elem[key];

    // if(emedia.isSafari && obj && obj.__undefinedEQDelete){ // safari delete stream时，地址栏会有个小喇叭; 要延迟删除
    //     emedia._stream_garbages || (emedia._stream_garbages = [])
    //     emedia._stream_garbages.push(obj);
    // }
    delete elem[key];

    return obj;
}

Util.prototype.prototypeExtend_000 = Util.prototype.classExtend = function(){
    var self = this;

    function _Obj__(){
        for(var i = 0; i < arguments.length; i++){
            var cfg = arguments[i] || {};
            self.extend(true, this, cfg);
        }

        this.__init__ && this.__init__.apply(this, arguments);
    }

    var lastConstructor;

    for(var i = 0; i < arguments.length; i++){
        var cfg = arguments[i] || {};

        if(typeof cfg === "function"){
            if(lastConstructor){
                cfg.constructor = lastConstructor;
                cfg.__proto__ = lastConstructor.prototype;
            }else{
                lastConstructor = cfg;
            }
        }else{
            self.extend(true, _Obj__.prototype, cfg);
        }
    }

    lastConstructor && (_Obj__.prototype.__proto__ = lastConstructor.prototype);
    lastConstructor && (_Obj__.prototype.constructor = lastConstructor);

    _Obj__.extend || (_Obj__.extend = function (_prototypeExtend) {
        return self.prototypeExtend(_Obj__, _prototypeExtend);
    });

    return _Obj__;
}

Util.prototype.prototypeExtend = Util.prototype.classExtend = function(){
    var self = this;

    function _Obj__(){
        for(var i = 0; i < arguments.length; i++){
            var cfg = arguments[i] || {};
            self.extend(true, this, cfg);
        }

        this.__init__ && this.__init__.apply(this, arguments);
    }

    for(var i = 0; i < arguments.length; i++){
        var cfg = arguments[i] || {};
        if(typeof cfg === "function"){
            cfg = cfg.prototype;
        }

        self.extend(true, _Obj__.prototype, cfg);
    }

    _Obj__.extend || (_Obj__.extend = function (_prototypeExtend) {
        return self.prototypeExtend(_Obj__, _prototypeExtend);
    });

    return _Obj__;
}

/**
 * get local cache
 *
 * @memberOf tool
 * @name hasLocalData
 * @param key{string}
 *            localStorage的key值
 * @return boolean
 */
Util.prototype.hasLocalStorage = function (key) {
    // null -> localStorage.removeItem时
    // '{}' -> collection.models.destroy时
    if (localStorage.getItem(key) == null || localStorage.getItem(key) == '{}') {
        return false;
    }
    return true;
}

Util.prototype.toggleClass = function (node, className) {
    if (node.hasClass(className)) {
        node.removeClass(className);
        return;
    }
    node.addClass(className);
}


/**
 * set cookie
 *
 * @param name{String}
 *
 * @param value{String}
 *
 * @param hour{Number}
 *
 * @return void
 */
Util.prototype.setCookie = function (name, value, hour) {
    var exp = new Date();
    exp.setTime(exp.getTime() + hour * 60 * 60 * 1000);
    document.cookie = name + "=" + escape(value) + ";expires=" + exp.toGMTString();
}

/**
 * read cookie
 *
 * @param name(String)
 *            cookie key
 * @return cookie value
 * @memberOf Tool
 */
Util.prototype.getCookie = function (name) {
    var arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
    if (arr != null) {
        return unescape(arr[2]);
    }
    return null;
}


/**
 * query parameter from url
 *
 * @name parseURL
 * @memberof C.Tools
 * @param {string}
 *
 * @return {string}
 * @type function
 * @public
 */
Util.prototype.parseURL = function (name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) {
        return unescape(r[2]);
    }
    return null;
}

/**
 * function(index, value){

}
 * @param obj
 */
Util.prototype.forEach = function (obj, func){
    if(!obj){
        return;
    }

    if(this.isArray(obj) && obj.length === 0){
        return;
    }
    if(obj.length !== undefined && obj.length === 0){
        return;
    }
    if(obj.length){
        for(var i = 0; i < obj.length; i++){
            func(i, obj[i]);
        }
        return;
    }

    if(!obj || this.isEmptyObject(obj)){
        return;
    }

    obj = obj || {};

    var copy = this.extend(false, {}, obj);

    for(var index in copy){
        func(index, obj[index]);
    }
}

Util.prototype.isInt = function(n){
    return Number(n) === n && n % 1 === 0;
}

Util.prototype.isFloat = function(n){
    return Number(n) === n && n % 1 !== 0;
}

Util.prototype.list = function () {
    var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
    return args;
}

Util.prototype.addEvent = function (element, name, func) {
    if (element.attachEvent)
        return element.attachEvent("on" + name, func);
    if (element.addEventListener)
        return element.addEventListener(name, func, false);
    throw "Handler could not be attached";
}

Util.prototype.removeEvent = function (element, name, func) {
    if (element.detachEvent)
        return element.detachEvent("on" + name, func);
    if (element.removeEventListener)
        return element.removeEventListener(name, func, false);
    throw "Handler could not be removed";
}

Util.prototype.stopEvent = function (event) {
    event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true;
    event.preventDefault ? event.preventDefault() : event.returnValue = false;
}

Util.prototype.getDomPageRect = function(element) {
    var domRect = element.getBoundingClientRect();
    return {
        x: domRect.left + (window.pageXOffset || window.document.documentElement.scrollLeft),
        y: domRect.top + (window.pageYOffset || window.document.documentElement.scrollTop),
        width: domRect.width || element.offsetWidth,
        height: domRect.height || element.offsetHeight
    }
}

Util.prototype.getEventElementXY = function(event, element, scale) {
    event = (event || window.event);

    var touch = event.changedTouches ? event.changedTouches[0] : (event.touches ? event.touches[0] : event);

    var pageX, pageY;
    if(touch.pageX != undefined && touch.pageY != undefined){
        pageX = touch.pageX;
        pageY = touch.pageY;
    }else if(touch.clientX != undefined && touch.clientY != undefined){
        pageX = touch.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        pageY = touch.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    var elementPageXY = this.getDomPageRect(element);

    var relativeX = pageX - elementPageXY.x;
    var relativeY = pageY - elementPageXY.y;

    (scale === 0 || scale == undefined) && (scale = 1);
    return {
        x: Math.round(Math.max(Math.min(relativeX, elementPageXY.width - 1), 0) / scale),
        y: Math.round(Math.max(Math.min(relativeY, elementPageXY.height - 1), 0) / scale),
        width: Math.round(elementPageXY.width / scale),
        height: Math.round(elementPageXY.height / scale),

        realX: relativeX,
        realY: relativeY
    }
}

Util.prototype.layoutEngine = (function () {
    var engine = {
        presto: !!window.opera,
        trident: !!window.ActiveXObject && (window.XMLHttpRequest ? document.querySelectorAll ? 6 : 5 : 4),
        webkit: function() {
            try {
                return !navigator.taintEnabled && (i.Features.xpath ? i.Features.query ? 525 : 420 : 419)
            } catch (e) {
                return !1
            }
        }(),
        gecko: !(!document.getBoxObjectFor && null == window.mozInnerScreenX) && (document.getElementsByClassName ? 19 : 18)
    };

    engine.webkit && (engine.webkit = function(e) {
        var n = (navigator.userAgent.match(/WebKit\/([0-9\.]*) /) || ["", e])[1];
        return parseFloat(n, 10);
    }(engine));

    return engine;
})();


Util.prototype.targetDOM = ( typeof HTMLElement === 'object' ) ?
    function(obj){
        return obj instanceof HTMLElement;
    } :
    function(obj){
        return obj && typeof obj === 'object' && obj.nodeType === 1 && typeof obj.nodeName === 'string';
    };

Util.prototype.cloneCSS = function (srcElement, destElement) {
    /**
     * IE8不支持window.getComputedStyle
     * IE9~11中，window.getComputedStyle().cssText返回的总为空字符串
     * 默认的window.getComputedStyle || dom.currentStyle, 返回的css键值对中，键是驼峰命名的。
     */
    var oStyle = (window.getComputedStyle && window.getComputedStyle(srcElement, null)) || srcElement.currentStyle;
    for (var key in oStyle) {
        var v = oStyle[key];
        if (/^[a-z]/i.test(key) && [null, '', undefined].indexOf(v) < 0) {
            destElement.style[key] = v;
        }
    }
};

Util.prototype.canYield = (function(){
    try {
        return eval("!!Function('yield true;')().next()");
    } catch(e) {
        return false;
    }
})();

module.exports = new Util();
