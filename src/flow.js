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

