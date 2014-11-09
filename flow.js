/**
 * Created by Shaun on 9/7/14.
 */

jack2d('Flow', ['helper', 'obj', 'FlowObject'],
function(Helper, Obj, FlowObject) {
  'use strict';

  function Flow(sourceObject, count, hookId) {
    //var flowObject = Obj.create(FlowObject);
    //return flowObject.source(sourceObjects, count, hookId);
    return FlowObject.instance(sourceObject);
  }

  return Flow;
});