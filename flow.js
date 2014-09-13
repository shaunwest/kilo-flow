/**
 * Created by Shaun on 9/7/14.
 */

jack2d('Flow', ['helper', 'obj', 'FlowObject'],
function(Helper, Obj, FlowObject) {
  'use strict';

  function Flow(sourceObject) {
    var flowObject = Obj.create(FlowObject);
    if(Helper.isString(sourceObject)) {
      sourceObject = Obj.create(sourceObject);
    }
    return flowObject.init(sourceObject || {});
  }

  return Flow;
});