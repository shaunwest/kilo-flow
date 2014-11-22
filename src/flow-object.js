/**
 * Created by Shaun on 8/10/14.
 */

kilo('FlowObject', ['Util', 'Obj', 'CommandRunner', 'CommandObject', 'Results'], function(Util, Obj, CommandRunner, CommandObject, Results) {
  'use strict';

  function containsProp(prop, targetObject) {
    return (Object.keys(targetObject).indexOf(prop) !== -1); // TODO: add indexOf polyfill
  }

  function attachCommandFunctions(sourceObject, destinationObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Util.isFunction(sourceObject[prop]) || containsProp(prop, FlowObject)) {
        return;
      }

      if(!destinationObject.__savedFunctions) {
        destinationObject.__savedFunctions = {};
      }
      destinationObject.__savedFunctions[prop] = sourceObject[prop];
      destinationObject[prop] = makeCommandFunction(destinationObject, sourceObject[prop]);
    });
  }

  function makeCommandFunction(commandObject, func) {
    return function() {
      /*var args = Util.argsToArray(arguments);
       commandObject.addCommand({
       func: func,
       args: args
       });

       return commandObject;*/
      return commandObject.call(func);
    };
  }

  function restoreFunctions(commandObject, targetObject) {
    var savedFunctions = commandObject.__savedFunctions;
    if(savedFunctions) {
      Object.keys(savedFunctions).forEach(function(prop) {
        targetObject[prop] = savedFunctions[prop];
      });
    }
  }

  function removeCommandFunctions(sourceObject, commandObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Util.isFunction(sourceObject[prop])) {
        return;
      }
      delete commandObject[prop];
    });
  }



  function processSourceObjects(sourceObjects, count) {
    var i, processedObjects = [];

    if(Util.isArray(sourceObjects)) {
      sourceObjects.forEach(function(sourceObject) {
        processedObjects.push(evaluateModule(sourceObject));
      });
    } else if(Util.isString(sourceObjects) && count) {
      for(i = 0; i < count; i++) {
        processedObjects.push(evaluateModule(sourceObjects));
      }
    } else {
      processedObjects.push(evaluateModule(sourceObjects));
    }

    return processedObjects;
  }

  function evaluateModule(moduleName) {
    if(!Util.isString(moduleName)) {
      return moduleName;
    }
    return Obj.create(moduleName);
  }

  function createCommandRunners(sourceObjects, hookId) {
    var commandRunner, commandRunners = [];
    sourceObjects.forEach(function(sourceObject) {
      commandRunner = new CommandRunner(sourceObject, hookId);
      commandRunners.push(commandRunner);
    });
    return commandRunners;
  }

  function executeCommandRunners(commandRunners) {
    commandRunners.forEach(function(commandRunner) {
      commandRunner.execute();
    });
  }

  function flowAlias(commandObject, commandName, args) {
    return commandObject[commandName].apply(commandObject, args);
  }

  var FlowObject = {
    after: function(hookId) {
      this.hookId = hookId;
      return this;
    },
    on: function() {
      return flowAlias(this.flow(), 'on', arguments);
    },
    when: function() {
      return flowAlias(this.flow(), 'when', arguments);
    },
    whenGroup: function() {
      return flowAlias(this.flow(), 'whenGroup', arguments);
    },
    whenNot: function() {
      return flowAlias(this.flow(), 'whenNot', arguments);
    },
    watch: function() {
      return flowAlias(this.flow(), 'watch', arguments);
    },
    flow: function(hookId) {
      var commandRunners, chronoId;
      var commandObject = Obj.create(CommandObject);
      var results = commandObject.results = Obj.clone(Results);
      hookId = hookId || this.hookId;

      if(hookId && this.getChronoId) {
        chronoId = this.getChronoId(hookId);
        commandObject.hookId = hookId;
      }
      commandObject.sourceIndex = 0;

      commandRunners = createCommandRunners([this], chronoId);
      results.add([this], commandRunners);

      attachCommandFunctions(this, commandObject);

      return commandObject;
    },
    source: function(sourceObjects, count, hookId, results) {
      var commandRunners;

      results = this.results = results || Obj.clone(Results);
      this.sourceIndex = 0;
      this.hookId = hookId;
      sourceObjects = processSourceObjects(sourceObjects, count);
      commandRunners = createCommandRunners(sourceObjects, hookId);
      results.add(sourceObjects, commandRunners);

      // TODO: should old command functions be removed (if they exist)?
      // TODO: investigate need for [0]
      // TODO: this isn't right
      attachCommandFunctions(sourceObjects[0], this);
      return this;
    },
    instance: function(sourceObject, hookId) {
      var flowInstance = Obj.merge(CommandObject);
      flowInstance.commandRunner = new CommandRunner(sourceObject, hookId);
      attachCommandFunctions(sourceObject, flowInstance);
      flowInstance.or = Obj.clone(flowInstance);
      flowInstance.or.logicMode = 'or';
      flowInstance.and = Obj.clone(flowInstance);
      flowInstance.and.logicMode = 'and';
      return flowInstance;
    }
  };

  return FlowObject;
});