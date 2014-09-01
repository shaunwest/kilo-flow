/**
 * Created by Shaun on 8/20/14.
 */

jack2d('FlowFactory', ['Factory', 'Flow'], function(Factory, Flow) {
  'use strict';

  return {
    flow: function(flowObject, context) {
      flowObject = flowObject || Factory(Flow);
      return flowObject.setFlowContext(context || this);
    },
    flowWhen: function(condition, flowObject, context) {
      flowObject = this.flow(flowObject, context);
      return flowObject.setFlowCondition(condition);
    },
    flowInclude: function(flowObject, context) {
      this.flow(flowObject, context);
      return this;
    },
    flowIncludeWhen: function(condition, flowObject, context) {
      this.flowWhen(condition, flowObject, context);
      return this;
    }
  };
});