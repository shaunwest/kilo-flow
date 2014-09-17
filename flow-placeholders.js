/**
 * Created by Shaun on 9/16/14.
 */

jack2d('FlowPlaceholders', [], function() {
  'use strict';

  function LastObjects() {}
  function LastObject() {}

  return {
    LastObjects: LastObjects,
    LastObject: LastObject,
    last: new LastObjects(),
    lastOne: new LastObject()
  };
});
