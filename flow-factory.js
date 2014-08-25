/**
 * Created by Shaun on 8/20/14.
 */

jack2d('FlowFactory', ['Factory', 'Flow'], function(Factory, Flow) {
  'use strict';

  return {
    flow: function(context) {
      var newFlow = Factory(Flow);
      return newFlow.setContext(context || this);
    }
  };
});