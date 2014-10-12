/**
 * Created by Shaun on 9/13/14.
 */

jack2d('FlowDefinition', ['helper', 'obj', 'FlowObject'], function(Helper, Obj, FlowObject) {
  'use strict';

  // not sure about using this anymore...
  function FlowDefinition(sourceObject) {
    var flowObject = Obj.create(FlowObject);
    return flowObject.init(sourceObject, 1, true); // <-- 'idle' no longer exists
  }

  return FlowDefinition;
});