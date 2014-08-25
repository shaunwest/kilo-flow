/**
 * Created by Shaun on 8/10/14.
 */

jack2d('Flow', ['helper', 'obj'], function(Helper, Obj) {
  'use strict';

  function FlowList() {
    this.items = [];
    this.counter = 0;
  }

  FlowList.prototype.set = function(item) {
    this.items[this.counter] = item;
  };

  FlowList.prototype.get = function() {
    return this.items[this.counter];
  };

  FlowList.prototype.next = function() {
    this.counter++;
  };

  FlowList.prototype.count = function() {
    return this.items.length;
  };

  function evaluateItem(item, target) {
    if((item.isFunc && item.value(target[item.prop])) ||
      target[item.prop] === item.value) {
      return !(item.ands && !evaluateAnd(item.ands, target));
    }
    return false;
  }

  function evaluateAnd(ands, target) {
    var numAnds, and, i;
    numAnds = ands.length;
    for(i = 0; i < numAnds; i++) {
      and = ands[i];
      if(and.isFunc) {
        if(!and.value(target[and.prop])) {
          return false;
        }
      } else {
        if(target[and.prop] !== and.value) {
          return false;
        }
      }
    }
    return true;
  }

  function resolveItem(item, target) {
    var ops, op, numValues, i;
    ops = item.ops;
    numValues = ops.length;

    for(i = 0; i < numValues; i++) {
      op = ops[i];
      if(op.func) {
        if(op.isCallback) {
          op.func.call(target);
        } else {
          target[op.func].apply(target, op.args);
        }
      } else {
        target[op.prop] = op.value;
      }
    }
  }

  function update(target, flowList) {
    var numItems, item, i;
    numItems = flowList.count();

    for(i = 0; i < numItems; i++) {
      item = flowList.items[i];
      if(evaluateItem(item, target)) {
        if(item.ops) {
          resolveItem(item, target);
        }
      }
    }
  }

  return Obj.mixin(['chronoObject', {
    setContext: function(context) {
      this.context = context;
      return this;
    },
    when: function(prop, value) {
      if(!Helper.isDefined(value)) {
        value = true;
      }
      if(!this.flowList) {
        var flowList = this.flowList = new FlowList();
        this.context.onFrame(function() {
          update(this, flowList);
        });
      } else {
        this.flowList.next();
      }
      this.flowList.set({
        prop: prop,
        value: value,
        isFunc: Helper.isFunction(value)
      });
      return this;
    },
    whenNot: function(prop) {
      return this.when(prop, false);
    },
    and: function(prop, value) {
      if(!Helper.isDefined(value)) {
        value = true;
      }
      var ands = this.flowList.get().ands;
      if(!ands) {
        this.flowList.get().ands = ands = [];
      }
      ands.push({
        prop: prop,
        value: value,
        isFunc: Helper.isFunction(value)
      });
      return this;
    },
    andNot: function(prop) {
      return this.and(prop, false);
    },
    set: function(prop, value) {
      var ops = this.flowList.get().ops;
      if(!ops) {
        this.flowList.get().ops = ops = [];
      }
      ops.push({prop: prop, value: value});
      return this;
    },
    call: function(func) {
      var args = Array.prototype.slice.call(arguments, 1),
        ops = this.flowList.get().ops;
      if(!ops) {
        this.flowList.get().ops = ops = [];
      }
      ops.push({func: func, args: args});
      return this;
    },
    run: function(func) {
      var ops = this.flowList.get().ops;
      if(!ops) {
        this.flowList.get().ops = ops = [];
      }
      ops.push({func: func, isCallback: true});
      return this;
    },
    done: function() {
      return this.context || this;
    }
  }]);
});