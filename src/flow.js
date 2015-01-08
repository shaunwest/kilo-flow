/**
 * Created by Shaun on 9/7/14.
 */

use(['Util', 'FlowObject', 'registerAll'], function(Util, FlowObject, registerAll) {
  'use strict';

  registerAll({
    Flow: function(sourceObject, hookId) {
      return FlowObject.instance(sourceObject, hookId);
    },
    'Flow.When': function(sourceObject, key, val) {
      return FlowObject.instance(sourceObject).when(key, val);
    },
    'Flow.Watch': function(sourceObject, key) {
      return FlowObject.instance(sourceObject).watch(key);
    },
    'Flow.On': function(sourceObject, eventName, func) {
      return FlowObject.instance(sourceObject).on(eventName, func);
    },
    'Flow.Model': function(sourceObject, hookId) {
      return FlowObject.model(sourceObject, hookId);
    }
  });
});