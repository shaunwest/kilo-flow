/**
 * Created by Shaun on 8/10/14.
 */

jack2d('FlowObject', ['helper', 'obj', 'CommandRunner', 'FlowPlaceholders'], function(Helper, Obj, CommandRunner, FlowPlaceholders) {
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
      var args = Helper.argsToArray(arguments);
      args.forEach(function(arg, index) {
        if(arg instanceof FlowPlaceholders.LastObjects) {
          args[index] = commandObject.lastSourceObjects;
        } else if(arg instanceof FlowPlaceholders.LastObject) {
          args[index] = commandObject.lastSourceObjects[0];
        }
      });
      var commandRunner = commandObject.commandRunner;
      commandRunner.add({
        func: func,
        args: args,
        context: commandObject.sourceObjects
      });
      return commandObject;
    };
  }

  function processSourceObjects(sourceObjects, count) {
    var i, processedObjects = [];

    if(Helper.isArray(sourceObjects)) {
      sourceObjects.forEach(function(sourceObject) {
        processedObjects.push(evaluateModule(sourceObject));
      });
    } else if(Helper.isString(sourceObjects) && count) {
      for(i = 0; i < count; i++) {
        processedObjects.push(evaluateModule(sourceObjects));
      }
    } else {
      processedObjects.push(evaluateModule(sourceObjects));
    }

    return processedObjects;
  }

  function evaluateModule(moduleName) {
    if(!Helper.isString(moduleName)) {
      return moduleName;
    }
    return Obj.create(moduleName);
  }

  return {
    init: function(sourceObjects, count, idle) {
      //this.complete = false;
      this.sourceObjects = processSourceObjects(sourceObjects, count);
      attachCommandFunctions(this.sourceObjects[0], this);
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
    next: function(sourceObjects, count) {
      this.lastSourceObjects = this.sourceObjects;
      removeCommandFunctions(this.lastSourceObjects[0], this);
      this.sourceObjects = processSourceObjects(sourceObjects, count);
      attachCommandFunctions(this.sourceObjects[0], this);
      return this;
    },
    done: function() {
      this.commandRunner.add({
        done: true
      });
      return this;
    },
    each: function(func) {
      var sourceObjects = this.sourceObjects;
      this.call(function() {
        sourceObjects.forEach(function(sourceObject) {
          func(sourceObject);
        });
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
        context: this.sourceObjects
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
        context: this.sourceObjects
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
        args: args,
        context: this.sourceObjects
      });
      return this;
    }
  };
});