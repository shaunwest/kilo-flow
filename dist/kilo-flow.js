/**
 * Created by Shaun on 5/1/14.
 */

var kilo = (function(id) {
  'use strict';

  var core, Util, Injector, appConfig = {}, gids = {}, elementMap = {}, previousOwner = undefined;
  var CONSOLE_ID = id;

  Util = {
    isDefined: function(value) { return (typeof value !== 'undefined'); },
    //isObject: function(value) { return (value !== null && typeof value === 'object'); },
    isBoolean: function(value) { return (typeof value === 'boolean'); },
    def: function(value, defaultValue) { return (typeof value === 'undefined') ? defaultValue : value; },
    error: function(message) { throw new Error(CONSOLE_ID + ': ' + message); },
    warn: function(message) { Util.log('Warning: ' + message); },
    log: function(message) { if(core.log) { console.log(CONSOLE_ID + ': ' + message); } },
    argsToArray: function(args) { return Array.prototype.slice.call(args); },
    getGID: function(prefix) {
      prefix = Util.def(prefix, '');
      gids[prefix] = Util.def(gids[prefix], 0);
      return prefix + (++gids[prefix]);
    },
    rand: function(max, min) {
      min = min || 0;
      if(min > max || max < min) { Util.error('rand: invalid range.'); }
      return Math.floor((Math.random() * (max - min + 1))) + (min);
    }
  };

  ['Array', 'Object', 'Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'HTMLImageElement'].
    forEach(function(name) { // TODO: don't use forEach
      Util['is' + name] = function(obj) {
        return Object.prototype.toString.call(obj) === '[object ' + name + ']';
      };
    });

  Injector = {
    unresolved: {},
    modules: {},
    register: function(key, deps, func, scope) {
      this.unresolved[key] = {deps: deps, func: func, scope: scope};
      return this;
    },
    unresolve: function(key) {
      if(this.modules[key]) {
        delete this.modules[key];
      }
    },
    setModule: function(key, module) { // save a module without doing dependency resolution
      this.modules[key] = module;
      return this;
    },
    getDependency: function(key) {
      var module = this.modules[key];
      if(module) {
        return module;
      }

      module = this.unresolved[key];
      if(!module) {
        Util.warn('Module \'' + key + '\' not found');
        return null;
      }

      Util.log('Resolving dependencies for \'' + key + '\'');
      module = this.modules[key] = this.resolveAndApply(module.deps, module.func, module.scope);
      if(Util.isObject(module)) {
        module.getType = function() { return key; };
      }
      return module;
    },
    resolve: function(deps, func, scope) {
      var dep, depName, args = [], i;
      for(i = 0; i < deps.length; i++) {
        depName = deps[i];
        dep = this.getDependency(depName);
        if(dep) {
          args.push(dep);
        } else {
          Util.warn('Can\'t resolve ' + depName);
        }
      }
      return args;
    },
    apply: function(args, func, scope) {
      return func.apply(scope || core, args);
    },
    resolveAndApply: function(deps, func, scope) {
      return this.apply(this.resolve(deps), func, scope);
    }
  };

  /** add these basic modules to the injector */
  Injector
    .setModule('helper', Util).setModule('Helper', Util).setModule('Util', Util)
    .setModule('injector', Injector).setModule('Injector', Injector)
    .setModule('appConfig', appConfig);

  /** run onReady when document readyState is 'complete' */
  function onDocumentReady(onReady) {
    var readyStateCheckInterval;
    if (document.readyState === 'complete') {
      onReady(document);
    } else {
      readyStateCheckInterval = setInterval(function () {
        if (document.readyState === 'complete') {
          onReady(document);
          clearInterval(readyStateCheckInterval);
        }
      }, 10);
    }
  }

  /** the main interface */
  core = function(keyOrDeps, depsOrFunc, funcOrScope, scope) {
    var result;
    // get dependencies
    if(Util.isArray(keyOrDeps)) {
      result = Injector.resolveAndApply(keyOrDeps, depsOrFunc, funcOrScope);
      if(Util.isObject(result)) {
        Object.keys(result).forEach(function(key) { // TODO: don't use Object.keys
          Injector.setModule(key, result[key]);
        });
      }

    // register a new module (with dependencies)
    } else if(Util.isArray(depsOrFunc) && Util.isFunction(funcOrScope)) {
      Injector.register(keyOrDeps, depsOrFunc, funcOrScope, scope);

    // register a new module (without dependencies)
    } else if(Util.isFunction(depsOrFunc)) {
      Injector.register(keyOrDeps, [], depsOrFunc, funcOrScope);

    // get a module
    } else if(keyOrDeps && !Util.isDefined(depsOrFunc)) {
      return Injector.getDependency(keyOrDeps);
    }

    return null;
  };

  core.unresolve = function(key) {
    Injector.unresolve(key);
  };
  core.noConflict = function() {
    window[id] = previousOwner;
    return core;
  };

  function findElement(elementId, elements, cb) {
    var i, numElements, selectedElement;

    for(i = 0, numElements = elements.length; i < numElements; i++) {
      selectedElement = elements[i];
      if(selectedElement.hasAttribute('data-' + elementId)) {
        if(!elementMap[elementId]) {
          elementMap[elementId] = [];
        }
        elementMap[elementId].push(selectedElement);
        cb(selectedElement);
      }
    }
  }

  function executeElement(elementId, elements, deps, func, parentElement) {
    findElement(elementId, elements, function(element) {
      if(deps) {
        func.apply(element, Injector.resolve(deps));
      } else {
        func.call(element, parentElement);
      }
    });
  }

  // TODO: decide if element() will be moved to new package (kilo-element)
  core.element = function(elementId, funcOrDeps, func) {
    var deps, allElements;

    if(Util.isFunction(funcOrDeps)) {
      func = funcOrDeps;
    } else if(Util.isArray(funcOrDeps)) {
      deps = funcOrDeps;
    } else {
      Util.error('element: second argument should be function or dependency array.');
    }

    onDocumentReady(function(document) {
      var body;
      if(!allElements) {
        body = document.getElementsByTagName('body');
        if(!body || !body[0]) {
          return;
        }
        allElements = body[0].querySelectorAll('*');
      }
      executeElement(elementId, allElements, deps, func);
    });

    return this;
  };
  core.childElement = function(parentId, elementId, funcOrDeps, func) {
    var deps;

    if(Util.isFunction(funcOrDeps)) {
      func = funcOrDeps;
    } else if(Util.isArray(funcOrDeps)) {
      deps = funcOrDeps;
    } else {
      Util.error('element: second argument should be function or dependency array.');
    }

    onDocumentReady(function() {
      var i, elements, numParents, parentElement;
      var parentElements = elementMap[parentId];
      for(i = 0, numParents = parentElements.length; i < numParents; i++) {
        parentElement = parentElements[i];
        elements = parentElement.querySelectorAll('*');
        executeElement(elementId, elements, deps, func, parentElement);
      }
    });

    return this;
  };
  core.onDocumentReady = core.ready = onDocumentReady;
  core.log = true;

  /** create global reference to core */
  if(window[id]) {
    Util.warn('a preexisting value at namespace \'' + id + '\' has been overwritten.');
    previousOwner = window[id];
  }
  window[id] = core;
  return core;
})('kilo');

/**
 * Created by Shaun on 10/18/14.
 */

kilo('Canvas', [], function() {
  'use strict';

  return {
    clearContext: function(context, width, height) {
      context.clearRect(0, 0, width, height);
    },
    drawBackground: function(context, width, height, x, y, color) {
      context.fillStyle = color || 'red';
      context.fillRect(x || 0, y || 0, width, height);
    },
    drawBorder: function(context, width, height, x, y, color) {
      context.beginPath();
      context.strokeStyle = color || 'black';
      context.rect(x || 0, y || 0, width, height);
      context.stroke();
      context.closePath();
    }
  };
});
/**
 * Created by Shaun on 11/2/2014.
 */

kilo('Extend', ['Obj'], function(Obj) {
  'use strict';

  return Obj.extend.bind(Obj);
});
/**
 * Created by Shaun on 8/3/14.
 */

kilo('Factory', ['Obj', 'Pool'], function(Obj, Pool) {
  'use strict';

  return function(TypeObject) {
    //var newObject = Pool.getObject();
    //return Obj.mixin([TypeObject, newObject]); // FIXME: mixin still auto-creates an empty object
    var newObject = Obj.mixin([TypeObject]);
    return newObject;
  };
});
/**
 * Created by Shaun on 7/6/14.
 */

kilo('Func', [], function() {
  'use strict';

  function partial(f) {
    var boundArgs = Array.prototype.slice.call(arguments, 1);
    return function() {
      var defaultArgs = boundArgs.slice();
      for(var i = 0; i < arguments.length; i++) {
        defaultArgs.push(arguments[i]);
      }
      return f.apply(this, defaultArgs);
    };
  }

  function wrap(f, wrapper) {
    return partial(wrapper, f);
  }

  function fastPartial(f) {
    return function() {
      var boundArgs =  Array.prototype.slice.call(arguments);
      var lastIndex = boundArgs.length;
      return function(val) {
        boundArgs[lastIndex] = val;
        return f.apply(this, boundArgs);
      };
    };
  }

  return {
    partial: partial,
    fastPartial: fastPartial,
    wrap: wrap
  };
});
/**
 * Created by Shaun on 6/4/14.
 */

kilo('HashArray', [], function() {
  'use strict';

  function HashArray() {
    this.values = [];
    this.keyMap = {};
  }

  function realignDown(keyMap, removedIndex) {
    var key;
    for(key in keyMap) {
      if(keyMap.hasOwnProperty(key) && keyMap[key] > removedIndex) {
        keyMap[key]--;
      }
    }
  }

  function realignUp(keyMap, splicedIndex) {
    var key;
    for(key in keyMap) {
      if(keyMap.hasOwnProperty(key) && keyMap[key] >= splicedIndex) {
        keyMap[key]++;
      }
    }
  }

  HashArray.prototype.set = function(key, value) {
    if(this.keyMap[key]) {
      this.values[this.keyMap[key]] = value;
      return true;
    } else {
      this.values.push(value);
      this.keyMap[key] = this.values.length - 1;
      return false;
    }
  };

  HashArray.prototype.splice = function(targetId, key, value) {
    var index = this.keyMap[targetId] + 1;
    this.values.splice(index, 0, value);
    realignUp(this.keyMap, index);
    this.keyMap[key] = index;
  };

  HashArray.prototype.get = function(key) {
    return this.values[this.keyMap[key]];
  };

  HashArray.prototype.remove = function(key) {
    var index = this.keyMap[key];
    this.values.splice(index, 1);
    realignDown(this.keyMap, index);
    delete this.keyMap[key];
  };

  HashArray.prototype.removeAll = function() {
    var keyMap = this.keyMap, key;
    this.values.length = 0;
    for(key in keyMap) {
      delete keyMap[key];
    }
  };

  HashArray.prototype.getIdByIndex = function(index) {
    var keyMap = this.keyMap, key;
    for(key in keyMap) {
      if(keyMap[key] === index) {
        return key;
      }
    }
    return '';
  };

  HashArray.prototype.getKeys = function() {
    var i, numItems = this.size(), result = [];
    for(i = 0; i < numItems; i++) {
      result.push(this.getIdByIndex(i));
    }
    return result;
  };

  HashArray.prototype.getValues = function() {
    return this.values;
  };

  HashArray.prototype.size = function() {
    return this.values.length;
  };

  return HashArray;
});
/**
 * Created by Shaun on 7/3/14.
 *
 * This is a decorator for HashArray. It adds automatic id management.
 */

kilo('KeyStore', ['HashArray', 'Util'], function(HashArray, Util) {
  'use strict';

  function KeyStore() {
    this.lastId = 0;
    this.store = new HashArray();
  }

  KeyStore.prototype.get = function(id) {
    return this.store.get(id);
  };

  KeyStore.prototype.set = function(valOrId, val) {
    var id;
    if(Util.isDefined(val)) {
      id = valOrId || this.lastId++;
    } else {
      id = this.lastId++;
      val = valOrId;
    }
    this.store.add(id, val);
    return id;
  };

  KeyStore.prototype.setGroup = function(valOrId, val) {
    var id, values;
    if(Util.isDefined(val)) {
      id = valOrId;
      if(Util.isDefined(id)) {
        values = this.get(id);
      } else {
        id = this.lastId++;
        values = [];
        this.store.add(id, values);
      }
    } else {
      id = this.lastId++;
      val = valOrId;
      values = [];
      this.store.add(id, values);
    }

    if(values) {
      values.push(val);
    } else {
      console.error('Jack2d: keyStore: id \''+ id + '\' not found.');
    }

    return id;
  };

  KeyStore.prototype.clear = function(id) {
    if(Util.isDefined(id)) {
      this.store.remove(id);
    } else {
      this.store.removeAll();
    }
  };

  KeyStore.prototype.getItems = function() {
    return this.store.items;
  };

  return KeyStore;
});
/**
 * Created by Shaun on 11/2/2014.
 */

kilo('Mixin', ['Obj'], function(Obj) {
  'use strict';

  return Obj.mixin.bind(Obj);
});

/**
 * Created by Shaun on 6/28/14.
 */

kilo('Obj', ['Injector', 'Util', 'Func', 'Pool'], function(Injector, Util, Func, Pool) {
  'use strict';

  function mergeObjects(giver, receiver, allowWrap, exceptionOnCollisions) {
    giver = giver || {};
    if(giver.__mixin === false) { // What about receiver?
      Util.error('Can\'t mixin object because the object has disallowed it.');
      return;
    }
    Object.keys(giver).forEach(function(prop) {
      if(receiver.hasOwnProperty(prop)) {
        if(allowWrap) {
          receiver[prop] = Func.wrap(receiver[prop], giver[prop]);
          Util.log('Mixin: wrapped \'' + prop + '\'');
        } else if(exceptionOnCollisions) {
          Util.error('Failed to merge mixin. Method \'' +
            prop + '\' caused a name collision.');
        } else {
          receiver[prop] = giver[prop];
          Util.log('Mixin: overwrote \'' + prop + '\'');
        }
      } else {
        receiver[prop] = giver[prop];
      }
    });
  }

  function augmentMethods(targetObject, augmenter) {
    var newObject = {}; // TODO: use pooling?

    Object.keys(targetObject).forEach(function(prop) {
      if(!Util.isFunction(targetObject[prop])) {
        return;
      }
      newObject[prop] = augmentMethod(targetObject[prop], targetObject, augmenter);
    });

    return newObject;
  }

  function augmentMethod(method, context, augmenter) {
    return function() {
      var args = Util.argsToArray(arguments);
      if(augmenter) {
        args.unshift(method);
        return augmenter.apply(context, args);
      } else {
        return method.apply(context, args);
      }
    };
  }

  return {
    replaceMethod: function(context, oldMethod, newMethod, message) {
      Object.keys(context).forEach(function(prop) {
        if(context[prop] === oldMethod) {
          console.log(message);
          context[prop] = newMethod;
        }
      });
    },
    augment: function(object, augmenter) {
      return augmentMethods(object, augmenter);
    },
    clone: function(object) {
      return this.merge(object);
    },
    merge: function(source, destination) {
      var prop;
      destination = destination || {};
      for(prop in source) {
        if(source.hasOwnProperty(prop)) {
          destination[prop] = source[prop];
        }
      }
      return destination;
    },
    create: function(source) {
      return this.mixin(source);
    },
    print: function(obj) {
      var prop, str = '';
      for(prop in obj) {
        if(obj.hasOwnProperty(prop) && !Util.isFunction(obj[prop])) {
          str += prop + ': ' + obj[prop] + '<br>';
        }
      }
      return str;
    },
    clear: function(obj) {
      var prop;
      for(prop in obj) {
        if(obj.hasOwnProperty(prop)) {
          delete obj[prop];
        }
      }
      return obj;
    },
    extend: function() {
      var args = (arguments.length > 1) ?
        Util.argsToArray(arguments) :
        arguments[0];
      return this.mixin(args, true);
    },
    // TODO: make this work with functions
    // TODO: should it always create a new object? Should be able to mix into existing object
    mixin: function(giver, allowWrap, exceptionOnCollisions) {
      var receiver = Pool.getObject();
      if(Util.isArray(giver)) {
        giver.forEach(function(obj) {
          if(Util.isString(obj)) {
            obj = Injector.getDependency(obj);
          }
          mergeObjects(obj, receiver, allowWrap, exceptionOnCollisions);
        });
      } else {
        if(Util.isString(giver)) {
          giver = Injector.getDependency(giver);
        }
        mergeObjects(giver, receiver, allowWrap, exceptionOnCollisions);
      }

      return receiver;
    }
  };
});
/**
 * Created by Shaun on 7/4/14.
 */

kilo('Pool', [], function() {
  'use strict';

  var objects = [];

  function getObject() {
    var newObject = objects.pop();
    if(!newObject) {
      newObject = {};
    }
    return newObject;
  }

  function clearObject(obj) {
    var prop;
    for(prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        delete obj[prop];
      }
    }
    return obj;
  }

  function killObject(unusedObject) {
    objects.push(clearObject(unusedObject));
  }

  function available() {
    return objects.length;
  }

  return {
    getObject: getObject,
    killObject: killObject,
    available: available
  };
});
/**
 * Created by Shaun on 7/16/14.
 */

kilo('rect', [], function() {
  'use strict';

  function containsPoint(x, y, rect) {
    return !(x < rect.left || x > rect.right ||
      y < rect.top || y > rect.bottom);
  }

  function containsRect(inner, outer) {
    return !(inner.left < outer.left ||
      inner.right > outer.right ||
      inner.top < outer.top ||
      inner.bottom > outer.bottom);
  }

  // WTF?
  function containsRectX(inner, outer) {
    var contains = !(inner.left < outer.left || inner.right > outer.right);
    return (contains) ? false : inner.left - outer.left;
  }

  function containsX(x, outer) {
    return !(x < outer.left || x > outer.right);
  }

  // WTF?
  function containsRectY(inner, outer) {
    var contains = !(inner.top < outer.top || inner.bottom > outer.bottom);
    return (contains) ? false : inner.top - outer.top;
  }

  function containsY(y, outer) {
    return !(y < outer.top || y > outer.bottom);
  }

  function intersectsRectX(r1, r2) {
    var intersects = !(r2.left >= r1.right || r2.right <= r1.left);
    return (intersects) ? r1.left - r2.left : false;
  }

  function intersectsRectY(r1, r2) {
    var intersects = !(r2.top >= r1.bottom || r2.bottom <= r1.top);
    return (intersects) ? r1.top - r2.top : false;
  }

  return {
    setLeft: function(left) {
      this.left = left;
      return this;
    },
    setTop: function(top) {
      this.top = top;
      return this;
    },
    setRight: function(right) {
      this.right = right;
      return this;
    },
    setBottom: function(bottom) {
      this.bottom = bottom;
      return this;
    },
    containsPoint: containsPoint,
    containsRect: containsRect,
    containsX: containsX,
    containsY: containsY,
    containsRectX: containsRectX,
    containsRectY: containsRectY,
    intersectsRectX: intersectsRectX,
    intersectsRectY: intersectsRectY
  };
});
/**
 * Created by Shaun on 5/31/14.
 */

(function(frameLength) {
  'use strict';
  var vendors = ['ms', 'moz', 'webkit', 'o'], x;

  for(x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
      window[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      return window.setTimeout(callback, frameLength);
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      window.clearTimeout(id);
    };
  }
})(62.5);
/**
 * Created by Shaun on 6/7/14.
 */

kilo('SchedulerObject', ['Util', 'Scheduler', 'Func'], function(Helper, Chrono, Func) {
  'use strict';

  return {
    onFrame: function(callback, id) {
      var gid = Helper.getGID(id);

      if(!this.chronoIds) {
        this.chronoIds = [];
      }
      if(!this.hooks) {
        this.hooks = {};
      }

      callback = callback.bind(this);
      if(id) {
        this.hooks[id] = gid;
      }
      this.chronoIds.push(Chrono.register(callback, gid));
      return this;
    },
    getChronoId: function(hookId) {
      if(!this.hooks) {
        return null;
      }
      return this.hooks[hookId];
    },
    // wraps an existing chrono task
    hook: function(id, wrapper) {
      var f, chronoId = this.getChronoId(id);
      if(chronoId) {
        f = Chrono.getRegistered(chronoId);
        f = Func.wrap(f, wrapper);
        Chrono.register(f, chronoId);
      }
    },
    killOnFrame: function(chronoId) {
      if(chronoId) {
        Chrono.unRegister(chronoId);
      } else if(this.chronoIds) {
        this.chronoIds.forEach(function(chronoId) {
          Chrono.unRegister(chronoId);
        });
      }

      return this;
    }
  };
});
/**
 * Created by Shaun on 5/31/14.
 */

kilo('Scheduler', ['HashArray', 'Util'], function(HashArray, Util) {
  'use strict';

  var ONE_SECOND = 1000,
    targetFps,
    actualFps,
    ticks,
    running,
    elapsedSeconds,
    registeredCallbacks,
    lastRegisteredId,
    lastUid,
    oneSecondTimerId,
    frameTimerId,
    lastUpdateTime,
    obj;

  init();

  function init() {
    reset();
    start();
    return obj;
  }

  function reset() {
    targetFps = 60;
    actualFps = 0;
    ticks = 0;
    elapsedSeconds = 0;
    lastRegisteredId = 0;
    lastUid = 0;
    registeredCallbacks = new HashArray();
    running = false;
    lastUpdateTime = new Date();
    return obj;
  }

  function register(callback, id) {
    if(!Util.isFunction(callback)) {
      Util.error('Scheduler: only functions can be registered.');
    }
    if(!id) {
      id = Util.getGID(id);
    }

    registeredCallbacks.set(id, callback);

    return id;
  }

  function registerAfter(afterId, callback, id) {
    if(!id) {
      id = lastRegisteredId++;
    }
    registeredCallbacks.splice(afterId, id, callback);
    return id;
  }

  function unRegister(id) {
    registeredCallbacks.remove(id);
    return obj;
  }

  function getRegistered(id) {
    return (id) ? registeredCallbacks.get(id) : registeredCallbacks.getValues();
  }

  function requestNextFrame() {
    frameTimerId = window.requestAnimationFrame(onFrame);
  }

  function registeredCount() {
    return registeredCallbacks.size();
  }

  function start() {
    if(!running) {
      running = true;
      oneSecondTimerId = window.setInterval(onOneSecond, ONE_SECOND);
      onFrame();
    }
    return obj;
  }

  function stop() {
    running = false;
    window.clearInterval(oneSecondTimerId);
    window.cancelAnimationFrame(frameTimerId);
    return obj;
  }

  function onFrame() {
    executeFrameCallbacks(getDeltaTime());
    tick();

    if(running) {
      requestNextFrame();
    }
  }

  function executeFrameCallbacks(deltaTime) {
    var items, numItems, item, i;

    items = registeredCallbacks.getValues();
    numItems = items.length;

    for(i = 0; i < numItems; i++) {
      item = items[i];
      if(item) {
        item(deltaTime);
      }
    }
  }

  function getDeltaTime() {
    var now = +new Date(),
      elapsed = (now - lastUpdateTime) / ONE_SECOND;

    lastUpdateTime = now;

    return elapsed;
  }

  function tick() {
    ticks++;
  }

  function onOneSecond() {
    actualFps = ticks.toString();
    ticks = 0;
    elapsedSeconds++;
  }

  function getFps() {
    return actualFps;
  }

  function getSeconds() {
    return elapsedSeconds;
  }

  obj = {
    __mixin: false,
    init: init,
    reset: reset,
    start: start,
    stop: stop,
    register: register,
    registerAfter: registerAfter,
    unRegister: unRegister,
    getRegistered: getRegistered,
    registeredCount: registeredCount,
    getFps: getFps,
    getSeconds: getSeconds
  };

  return obj;
});
/**
 * Created by Shaun on 11/18/2014.
 */

kilo('CommandObject', ['Util'], function(Util) {
  'use strict';

  function addCommand(context, commandConfig) {
    context.commandRunner.add(commandConfig);
    return context;
  }

  function done() { //TODO: change to 'end'
    return addCommand(this, {done: true});
  }

  function get(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return addCommand(this, {
      func: func,
      sourceAsArg: true,
      args: args,
      context: this
    });
  }

  function watch(prop) {
    return addCommand(this, {
      watchProp: prop,
      lastValue: null, // FIXED... hopefully -- doesn't work because values vary between sourceObjects
      logicals: [],
      specials: []
    });
  }

  function whenGroup(prop, value) {
    return this.when(prop, value, true);
  }

  function endGroup() {
    return addCommand(this, {endGroup: true});
  }

  function when(prop, value, group) {
    return addCommand(this, {
      whenProp: prop,
      whenValue: value,
      isFunc: Util.isFunction(value),
      logicals: [],
      specials: [],
      commands: [],
      group: group
    });
  }

  function whenNot(prop) {
    return this.when(prop, false);
  }

  function andWhen(prop, value) {
    return addCommand(this, {
      isLogical: true,
      logicalProp: prop,
      logicalValue: value,
      logicalType: 'and',
      isFunc: Util.isFunction(value),
      specials: []
    });
  }

  function orWhen(prop, value) {
    return addCommand(this, {
      isLogical: true,
      logicalProp: prop,
      logicalValue: value,
      logicalType: 'or',
      isFunc: Util.isFunction(value),
      specials: []
    });
  }

  function set(prop, value, inc, format) {
    return addCommand(this, {
      setProp: prop,
      setValue: value,
      inc: inc,
      format: format
    });
  }

  function inc(prop, value, format) {
    return this.set(prop, value, true, format);
  }

  function on(eventName) {
    return addCommand(this, {
      eventName: eventName
    });
  }

  function call(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return addCommand(this, {
      func: func,
      args: args
    });
  }

  function source() {
    return this.commandRunner.context;
  }

  return {
    commandRunner: null,
    logicMode: '',
    done: done,
    get: get,
    watch: watch,
    whenGroup: whenGroup,
    endGroup: endGroup,
    when: when,
    whenNot: whenNot,
    andWhen: andWhen,
    orWhen: orWhen,
    set: set,
    inc: inc,
    on: on,
    call: call,
    source: source
  };
});

/**
 * Created by Shaun on 9/11/14.
 */

kilo('CommandRunner', ['Util', 'Scheduler'], function(Util, Scheduler) {
  'use strict';

  function getLastObject(obj, propStr) {
    var props = propStr.split('.');
    if(props.length === 1) {
      return obj;
    }
    return getObject(obj, props);

    function getObject(obj, props) {
      if(!obj) {
        return obj;
      } else if(props.length === 2) {
        return obj[props[0]];
      } else {
        return getObject(obj[props[0]], props.slice(1));
      }
    }
  }

  function getLastProp(propStr) {
    return propStr.split('.').slice(-1)[0];
  }

  function CommandRunner(context, chronoId) {
    this.chronoId = chronoId;
    this.context = context;
    this.conditional = null;
    this.specialQueue = null;
  }

  CommandRunner.prototype.add = function(command) {
    if(command.setProp) {
      command.context = getLastObject(this.context, command.setProp);
      command.setProp = getLastProp(command.setProp);
    }
    this.evaluateCommand(command);
  };

  CommandRunner.prototype.evaluateCommand = function(command) {
    if(command.whenProp || command.watchProp) { // FIXME: when should cancel a previous 'event'
      if(!this.specialQueue) {
        this.specialQueue = this.repeatQueue();
      }
      this.specialQueue.push(command);
    } else if(command.eventName) {
      this.specialQueue = this.eventQueue(command);
    } else if(command.done) {
      this.specialQueue = null;
    } else if(this.specialQueue) {
      this.specialQueue.push(command);
    } else {
      return this.executeCommand(command);
    }
    return null;
  };

  CommandRunner.prototype.repeatQueue = function() {
    var repeatQueue = [];

    if(this.chronoId) {
      Scheduler.registerAfter(this.chronoId, function() {
        this.processRepeatCommands(repeatQueue);
      }.bind(this), Util.getGID('command-repeat'));

    } else {
      Scheduler.register(function() {
        this.processRepeatCommands(repeatQueue);
      }.bind(this), Util.getGID('command-repeat'));
    }

    return repeatQueue;
  };

  CommandRunner.prototype.eventQueue = function(command) {
    var eventQueue = [], context = this.context;
    var that = this;
    if(context.addEventListener) {
      context.addEventListener(command.eventName, function() {
        var i, numCommands = eventQueue.length;
        for(i = 0; i < numCommands; i++) {
          that.executeCommand(eventQueue[i]);
        }
      });
    }

    return eventQueue;
  };


  CommandRunner.prototype.processRepeatCommands = function(commandQueue) {
    var numCommands, command, conditional = null,
      groupConditional = null, i = 0;

    numCommands = commandQueue.length;

    while(i < numCommands) {
      command = commandQueue.shift();
      if(command.group) {
        groupConditional = command;
      } else if(command.endGroup) {
        groupConditional = null;
      } else if(command.whenProp || command.watchProp) {
        conditional = command;
        conditional.logicals.length = 0;
      } else if(conditional && command.isLogical) {
        conditional.logicals.push(command);
      } else if(groupConditional) {
        if(this.evaluateConditional(groupConditional)) {
          if(conditional && this.evaluateConditional(conditional)) {
            this.executeCommand(command);
          }
        }
      } else if(conditional) {
        if(this.evaluateConditional(conditional)) {
          this.executeCommand(command);
        }
      }
      commandQueue.push(command);
      i++;
    }
  };

  CommandRunner.prototype.checkWatch = function(command) {
    var context = this.context;
    if(context[command.watchProp] !== command.lastValue) {
      command.lastValue = context[command.watchProp];
      return true;
    }
    return false;
  };

  CommandRunner.prototype.evaluateConditional = function(conditional) {
    var context = this.context;
    if((conditional.isFunc && conditional.whenValue.call(context, context[conditional.whenProp])) ||
      (conditional.watchProp && this.checkWatch(conditional, context)) ||
      conditional.whenProp && Util.isDefined(conditional.whenValue) && (context[conditional.whenProp] === conditional.whenValue) ||
      conditional.whenProp && !Util.isDefined(conditional.whenValue) && Util.isDefined(context[conditional.whenProp])
    ) {
      if(conditional.logicals.length > 0) {
        return this.evaluateLogical(conditional.logicals, conditional.whenProp || conditional.watchProp, true);
      }
      return true;
    }
    if(conditional.logicals.length > 0) {
      return this.evaluateLogical(conditional.logicals, conditional.whenProp || conditional.watchProp, false);
    }
    return false;
  };

  CommandRunner.prototype.evaluateLogical = function(logicals, logicalProp, logicState) {
    var numLogicals, logical, logicalType, i;
    var context = this.context;

    for(i = 0, numLogicals = logicals.length; i < numLogicals; i++) {
      logical = logicals[i];
      logicalType = logical.logicalType;
      logicalProp = logical.logicalProp || logicalProp;
      if(logical.isFunc) {
        if(logical.logicalValue.call(context, context[logicalProp])) {
          if(logicalType === 'or') {
            return true;
          }
        } else if(logicalType === 'and') {
          logicState = false;
        }
      } else {
        if(Util.isDefined(context[logicalProp])) {
          if(logicalType === 'or') {
            return true;
          }
        } else if(logicalType === 'and') {
          logicState = false;
        }
      }
    }
    return logicState;
  };

  CommandRunner.prototype.executeCommand = function(command) {
    var context = this.context, result, prop, propVal;

    if(command.complete) { // FIXME
      if(this.commandQueue.length === 0) {
        command.func.apply(command); //, command.args);
      } else {
        result = command;
      }
    } else if(command.eventName) {
      if(context.addEventListener) {
        context.addEventListener(command.eventName, command.func);
      }
    } else if(command.func) {
      if(command.sourceAsArg) {
        command.args.unshift(context);
      }
      command.func.apply(command.context || context, command.args);
    } else if(command.setProp) {
      prop = command.setProp;
      if(command.inc) {
        if(command.format === 'px') {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue + 'px';
          } else {
            propVal = command.context[prop];
            command.context[prop] = parseInt(propVal) + command.setValue + 'px';
          }
        } else if(command.format === '%') {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue + '%';
          } else {
            propVal = command.context[prop];
            command.context[prop] = parseInt(propVal) + command.setValue + '%';
          }
        } else {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue;
          }
          command.context[prop] += command.setValue;
        }
      } else {
        command.context[prop] = command.setValue;
      }
    }
    return result;
  };

  return CommandRunner;
});
/**
 * Created by Shaun on 9/13/14.
 */

kilo('FlowDefinition', ['helper', 'obj', 'FlowObject'], function(Helper, Obj, FlowObject) {
  'use strict';

  // not sure about using this anymore...
  function FlowDefinition(sourceObject) {
    var flowObject = Obj.create(FlowObject);
    return flowObject.init(sourceObject, 1, true); // <-- 'idle' no longer exists
  }

  return FlowDefinition;
});
/**
 * Created by Shaun on 11/18/2014.
 */

kilo(['Func'], function(Func) {
  'use strict';

  // Hmmm... these aren't initialized when they're needed... they're initialized immediately when this
  // containing function executes... normally we don't want to execute code that might not be
  // needed, tho these are very small functions and they're pretty fundamental to Flow operations...
  return {
    greaterThan: Func.fastPartial(function(compare, val) {
      return val > compare;
    }),
    lessThan: Func.fastPartial(function(compare, val) {
      return val < compare;
    }),
    between: Func.fastPartial(function(compare1, compare2, val) {
      return (compare1 < val && val < compare2);
    }),
    greaterThanOrEqual: Func.fastPartial(function(compare, val) {
      return val >= compare;
    }),
    lessThanOrEqual: Func.fastPartial(function(compare, val) {
      return val <= compare;
    }),
    betweenInclusive: Func.fastPartial(function(compare1, compare2, val) {
      return (compare1 <= val && val <= compare2);
    }),
    outside: Func.fastPartial(function(compare1, compare2, val) {
      return (val < compare1 && val > compare2);
    }),
    and: Func.fastPartial(function() {
      // val = last arg
      // for each func, pass in val
    })
  };
});

/**
 * Created by Shaun on 8/10/14.
 */

kilo('FlowObject', ['Util', 'Obj', 'CommandRunner', 'CommandObject', 'Results'], function(Util, Obj, CommandRunner, CommandObject, Results) {
  'use strict';

  function containsProp(prop, targetObject) {
    return (Object.keys(targetObject).indexOf(prop) !== -1); // TODO: add indexOf polyfill
  }

  function attachCommandFunctions(sourceObject, destinationObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Util.isFunction(sourceObject[prop]) || containsProp(prop, FlowObject)) {
        return;
      }

      if(!destinationObject.__savedFunctions) {
        destinationObject.__savedFunctions = {};
      }
      destinationObject.__savedFunctions[prop] = sourceObject[prop];
      destinationObject[prop] = makeCommandFunction(destinationObject, sourceObject[prop]);
    });
  }

  function makeCommandFunction(commandObject, func) {
    return function() {
      return commandObject.call(func);
    };
  }

  function restoreFunctions(commandObject, targetObject) {
    var savedFunctions = commandObject.__savedFunctions;
    if(savedFunctions) {
      Object.keys(savedFunctions).forEach(function(prop) {
        targetObject[prop] = savedFunctions[prop];
      });
    }
  }

  function removeCommandFunctions(sourceObject, commandObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Util.isFunction(sourceObject[prop])) {
        return;
      }
      delete commandObject[prop];
    });
  }

  function processSourceObjects(sourceObjects, count) {
    var i, processedObjects = [];

    if(Util.isArray(sourceObjects)) {
      sourceObjects.forEach(function(sourceObject) {
        processedObjects.push(evaluateModule(sourceObject));
      });
    } else if(Util.isString(sourceObjects) && count) {
      for(i = 0; i < count; i++) {
        processedObjects.push(evaluateModule(sourceObjects));
      }
    } else {
      processedObjects.push(evaluateModule(sourceObjects));
    }

    return processedObjects;
  }

  function evaluateModule(moduleName) {
    if(!Util.isString(moduleName)) {
      return moduleName;
    }
    return Obj.create(moduleName);
  }

  function createCommandRunners(sourceObjects, hookId) {
    var commandRunner, commandRunners = [];
    sourceObjects.forEach(function(sourceObject) {
      commandRunner = new CommandRunner(sourceObject, hookId);
      commandRunners.push(commandRunner);
    });
    return commandRunners;
  }

  function executeCommandRunners(commandRunners) {
    commandRunners.forEach(function(commandRunner) {
      commandRunner.execute();
    });
  }

  function flowAlias(commandObject, commandName, args) {
    return commandObject[commandName].apply(commandObject, args);
  }

  var FlowObject = {
    after: function(hookId) {
      this.hookId = hookId;
      return this;
    },
    on: function() {
      return flowAlias(this.flow(), 'on', arguments);
    },
    when: function() {
      return flowAlias(this.flow(), 'when', arguments);
    },
    whenGroup: function() {
      return flowAlias(this.flow(), 'whenGroup', arguments);
    },
    whenNot: function() {
      return flowAlias(this.flow(), 'whenNot', arguments);
    },
    watch: function() {
      return flowAlias(this.flow(), 'watch', arguments);
    },
    /*flow: function(hookId) {
      var commandRunners, chronoId;
      var commandObject = Obj.create(CommandObject);
      var results = commandObject.results = Obj.clone(Results);
      hookId = hookId || this.hookId;

      if(hookId && this.getChronoId) {
        chronoId = this.getChronoId(hookId);
        commandObject.hookId = hookId;
      }
      commandObject.sourceIndex = 0;

      commandRunners = createCommandRunners([this], chronoId);
      results.add([this], commandRunners);

      attachCommandFunctions(this, commandObject);

      return commandObject;
    },*/
    /*source: function(sourceObjects, count, hookId, results) {
      var commandRunners;

      results = this.results = results || Obj.clone(Results);
      this.sourceIndex = 0;
      this.hookId = hookId;
      sourceObjects = processSourceObjects(sourceObjects, count);
      commandRunners = createCommandRunners(sourceObjects, hookId);
      results.add(sourceObjects, commandRunners);

      // TODO: should old command functions be removed (if they exist)?
      // TODO: investigate need for [0]
      // TODO: this isn't right
      attachCommandFunctions(sourceObjects[0], this);
      return this;
    },*/
    flow: function(hookId) {
      return this.instance(this, hookId);
    },
    instance: function(sourceObject, hookId) {
      var flowInstance = Obj.merge(CommandObject);
      flowInstance.commandRunner = new CommandRunner(sourceObject, hookId);
      attachCommandFunctions(sourceObject, flowInstance);
      return flowInstance;
    }
  };

  return FlowObject;
});
/**
 * Created by Shaun on 9/7/14.
 */

kilo('Flow', ['Util', 'Obj', 'FlowObject'], function(Util, Obj, FlowObject) {
  'use strict';

  function Flow(sourceObject, count, hookId) {
    //var flowObject = Obj.create(FlowObject);
    //return flowObject.source(sourceObjects, count, hookId);
    return FlowObject.instance(sourceObject);
  }

  return Flow;
});

kilo.flowElement = function(elementId, funcOrDeps, func) {
  'use strict';

  kilo(['Flow', 'Util'], function(Flow, Util) {
    var newFunc, newFuncOrDeps;

    if(Util.isFunction(funcOrDeps)) {
      newFuncOrDeps = function() {
        funcOrDeps.apply(Flow(this), arguments);
      };

    } else if(func) {
      newFuncOrDeps = funcOrDeps;
      newFunc = function() {
        func.apply(Flow(this), arguments);
      };
    }

    kilo.element(elementId, newFuncOrDeps, newFunc);
  });
};


/**
 * Created by Shaun on 11/18/2014.
 */

kilo('Results', ['Util'], function(Util) {
  'use strict';

  return {
    add: function(sourceObjects, commandRunners) {
      this.sets = Util.def(this.sets, []);
      this.count = (Util.isDefined(this.count)) ? this.count + 1 : 0;
      this.sets.push({
        commandRunners: commandRunners,
        sourceObjects: sourceObjects,
        addCommand: function(command, index) {
          var commandRunners = this.commandRunners;
          if(Util.isDefined(index) && index < commandRunners.length) {
            commandRunners[index].add(command);
          } else {
            commandRunners.forEach(function(commandRunner) {
              commandRunner.add(command);
            });
          }
        }
      });
    },
    get: function(index) {
      return this.sets[index];
    },
    current: function() {
      return this.sets[this.count];
    },
    next: function() {
      return this.sets[this.count + 1];
    },
    last: function() {
      return this.sets[this.count - 1];
    }
  };
});

/**
 * Created by Shaun on 7/6/14.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
 */
(function() {
  'use strict';
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== "function") {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
            aArgs.concat(Array.prototype.slice.call(arguments)));
        };

      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
})();

