/**
 * Created by Shaun on 9/7/14.
 */

jack2d('Flow', ['helper', 'obj', 'CommandQueue', 'CommandRunner'],
function(Helper, Obj, CommandQueue, CommandRunner) {
  'use strict';

  function Flow(sourceObject, commandQueue) {
    var flowObject = Obj.create(FlowObject);
    flowObject.init(sourceObject, commandQueue);
    return flowObject;
  }

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

  var FlowObject = {
    init: function(sourceObject) {
      //this.commandList = new CommandQueue();
      this.sourceObject = sourceObject;
      attachCommandFunctions(sourceObject, this);
      this.commandRunner = new CommandRunner();
      return this;
    },
    /*commit: function() {
      this.commandList = new CommandQueue();
      //this.commandRunner = new CommandRunner(this.commandList, this.sourceObject);
      this.commandRunner.addCommands(this.commandList);
      return this;
    },*/
    next: function(sourceObject) {
      removeCommandFunctions(this.sourceObject, this);
      attachCommandFunctions(sourceObject, this);
      this.sourceObject = sourceObject;
      return this;
    },
    /*next: function(sourceObject) {
      this.sourceObject = sourceObject;
      return Flow(sourceObject, this.commandList);
    },*/
    done: function() {
      this.commandRunner.add({
        done: true
      });
      return this;
    },
    when: function(prop, value) {
      var commandList = this.commandList;

      value = Helper.def(value, true);

      this.commandRunner.add({
        whenProp: prop,
        whenValue: value,
        isFunc: Helper.isFunction(value),
        ands: [],
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
      /*if(!Helper.isDefined(this.sourceObject[prop])) {
        this.sourceObject[prop] = 0;
      }*/
      this.set(prop, value, true);
      return this;
    }
  };

  return Flow;
});