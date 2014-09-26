/**
 * Created by Shaun on 9/7/14.
 */

jack2d('Flow', ['helper', 'obj', 'FlowObject', 'FlowPlaceholders'],
function(Helper, Obj, FlowObject, FlowPlaceholders) {
  'use strict';

  // TODO: should there be an option to pass in a factory?
  function Flow(sourceObjects, count) {
    var flowObject = Obj.create(FlowObject);
    return flowObject.init(sourceObjects, count);
  }

  Flow.last = FlowPlaceholders.last;
  Flow.lastOne = FlowPlaceholders.lastOne;

  return Flow;
});