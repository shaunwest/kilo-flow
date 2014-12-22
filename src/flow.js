/**
 * Created by Shaun on 9/7/14.
 */

register(['Util', 'Obj', 'FlowObject', 'registerAll'], function(Util, Obj, FlowObject, registerAll) {
  'use strict';

  registerAll({
    Flow: function(sourceObject, hookId) {
      return FlowObject.instance(sourceObject, hookId);
    },
    'Flow.When': function(sourceObject, key, val) {
      return FlowObject.instance(sourceObject).when(key, val);
    },
    'Flow.Watch': function(sourceObject, key) {
      return FlowObject.instance(sourceObject).watch(key);
    },
    'Flow.On': function(sourceObject, eventName) {
      return FlowObject.instance(sourceObject).on(eventName);
    },
    'Flow.Model': function(sourceObject, hookId) {
      return FlowObject.model(sourceObject, hookId);
    }
  });
});

/*register('FlowElement', ['Element','Flow', 'Util'], function(Element, Flow, Util) {
  'use strict';

  return function(elementId, funcOrDeps, func) {
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

    return Element(elementId, newFuncOrDeps, newFunc);
  };
});

use(['FlowElement'], function(FlowElement) {
  kilo.flowElement = FlowElement;
});*/