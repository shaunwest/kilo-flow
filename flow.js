/**
 * Created by Shaun on 9/3/14.
 */

jack2d('Flow', ['Proxy', 'WhenObject'], function(Proxy, WhenObject) {
  'use strict';

  function Flow(targetObject) {
    return makeFlowObject(targetObject);
  }

  function makeFlowObject(targetObject, previousFlowObject)  {
    var methodQueue = (previousFlowObject) ? previousFlowObject.methodQueue : null;
    var resultList = (previousFlowObject) ? previousFlowObject.resultList : null;
    var flowObject = Proxy(targetObject, methodQueue, resultList);
    /*var flowObject = Proxy(targetObject, methodQueue,
      function(methodData) {
        var i, len, args = methodData.args;
        for(i = 0, len = args.length; i < len; i++) {
          if(args[i] === '|') {
            args[i] = previousFlowObject.targetObject;
          }
        }
      });*/
    flowObject.next = createNextFunction(flowObject);
    flowObject.when = createWhenFunction(targetObject, flowObject);
    flowObject.pipe = createPipeFunction(flowObject);
    return flowObject;
  }

  function createPipeFunction(flowObject) {
    return function() {
      var methodName = arguments[0],
        args = Array.prototype.slice.call(arguments, 1);

      args.unshift(flowObject.resultList[flowObject.resultList.length - 1]);
      flowObject[methodName].apply(flowObject, args);
      return flowObject;
    };
  }

  function createWhenFunction(targetObject, previousFlowObject) {
    return function(whenProp, whenVal) {
      var whenObject = WhenObject(targetObject);
      whenObject.next = createNextFunction(previousFlowObject);
      whenObject.done = function() {
        return previousFlowObject;
      };
      return whenObject.when(whenProp, whenVal);
    };
  }

  function createNextFunction(previousFlowObject) {
    return function(targetObject) {
      return makeFlowObject(targetObject, previousFlowObject);
    };
  }

  return Flow;
});