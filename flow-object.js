/**
 * Created by Shaun on 8/10/14.
 */

jack2d('FlowObject', ['helper', 'obj', 'CommandRunner'], function(Helper, Obj, CommandRunner) {
  'use strict';

  function attachCommandFunctions(sourceObject, commandObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Helper.isFunction(sourceObject[prop])) {
        return;
      }
      commandObject[prop] = makeCommandFunction(commandObject, sourceObject[prop]);
    });
  }

  function removeCommandFunctions(sourceObject, commandObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Helper.isFunction(sourceObject[prop])) {
        return;
      }
      delete commandObject[prop];
    });
  }

  function makeCommandFunction(commandObject, func) {
    return function() {
      var commandRunner = commandObject.commandRunner;
      commandRunner.add({
        func: func,
        args: Helper.argsToArray(arguments),
        context: commandObject.sourceObject
      });
      return commandObject;
    };
  }

  return {
    init: function(sourceObject, idle) {
      //this.complete = false;
      this.sourceObject = sourceObject;
      attachCommandFunctions(sourceObject, this);
      this.commandRunner = new CommandRunner();
      if(!idle) {
        this.commandRunner.execute();
      }
      return this;
    },
    include: function(flowObject) {
      this.commandRunner.add(flowObject.commandRunner.commandQueue);
      return this;
    },
    next: function(sourceObject) {
      removeCommandFunctions(this.sourceObject, this);
      attachCommandFunctions(sourceObject, this);
      this.sourceObject = sourceObject;
      return this;
    },
    done: function() {
      this.commandRunner.add({
        done: true
      });
      return this;
    },
    whenGroup: function(prop, value) {
      return this.when(prop, value, true);
    },
    when: function(prop, value, group) {
      value = Helper.def(value, true);

      this.commandRunner.add({
        whenProp: prop,
        whenValue: value,
        isFunc: Helper.isFunction(value),
        ands: [],
        group: group,
        context: this.sourceObject
      });
      return this;
    },
    whenNot: function(prop) {
      return this.when(prop, false);
    },
    and: function(prop, value) {
      value = Helper.def(value, true);

      this.commandRunner.add({
        andProp: prop,
        andValue: value,
        isFunc: Helper.isFunction(value)
      });
      return this;
    },
    andNot: function(prop) {
      return this.and(prop, false);
    },
    set: function(prop, value, inc) {
      this.commandRunner.add({
        setProp: prop,
        setValue: value,
        inc: inc,
        context: this.sourceObject
      });
      return this;
    },
    inc: function(prop, value) {
      this.set(prop, value, true);
      return this;
    },
    call: function(func) {
      var args = Array.prototype.slice.call(arguments, 1);
      this.commandRunner.add({
        func: func,
        args: args
      });
      return this;
    }
  };
});