/**
 * Created by Shaun on 9/7/14.
 */

jack2d('Flow', ['helper', 'obj', 'FlowObject'],
function(Helper, Obj, FlowObject) {
  'use strict';

  function Flow(sourceObjects, count, hookId) {
    var flowObject = Obj.create(FlowObject);
    return flowObject.init(sourceObjects, count, hookId);
  }

  return Flow;
});