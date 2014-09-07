/**
 * Created by Shaun on 9/1/14.
 */

jack2d('Flow2', ['helper', 'obj', 'Pipe'], function(Helper, Obj, Pipe) {
  'use strict';

  /*function Flow(targetObject) {
    var flowObject = Obj.mixin(['FlowObject', {
      flow: function(newTargetObject) {
        return Flow(newTargetObject);
      },
      pipe: Pipe
    }]);

    flowObject.setFlowContext(targetObject);

    augmentMethods(targetObject, flowObject);

    return flowObject;
  }*/

  function Flow(targetObject) {
    Flow.initFlow(targetObject);
  }

  Flow.initFlow = function(targetObject) {
    this.setFlowContext(targetObject);
    augmentMethods(targetObject, this);
    return this;
  };

  Flow.flow = function(targetObject) {
    return Obj.mixin(['FlowObject'], Flow);
  };

  function augmentMethods(targetObject, flowObject) {
    Object.keys(targetObject).forEach(function(prop) {
      if(!Helper.isFunction(targetObject[prop])) {
        return;
      }
      flowObject[prop] = augmentMethod(targetObject[prop], targetObject);
    });
  }

  function augmentMethod(func, context, previousObject) {
    return function() {
      return func.apply(context, arguments);
    };
  }


  return Obj.mixin(['FlowObject', {
    initFlow: function(targetObject) {
      this.setFlowContext(targetObject);
      augmentMethods(targetObject, this);
    },
    flow: function(targetObject) {
      return Obj.mixin(['FlowObject'], Flow);
    }
  }]);

  //return Flow;
});