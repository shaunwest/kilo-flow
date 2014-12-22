/**
 * Created by Shaun on 8/10/14.
 */

kilo('FlowObject', ['Util', 'Injector', 'Obj', 'CommandRunner', 'CommandObject'], function(Util, Injector, Obj, CommandRunner, CommandObject) {
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

  // TODO: figure out what this might be used for
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
      return this.instance(this, hookId);
    },
    model: function(sourceObject, hookId) {
      /*var model;

      Injector.process(sourceObject, function(sourceObject) {
        model = {
          '$': sourceObject        
        };
      });*/

      return this.instance(sourceObject, hookId, true);
    },
    instance: function(sourceObject, hookId, model) {
      var flowInstance = Obj.merge(CommandObject);
      flowInstance.commandRunner = new CommandRunner(null, hookId);
      
      Injector.process(sourceObject, function(_sourceObject) {
        sourceObject = (model) ? { '$': _sourceObject } : _sourceObject; 
        attachCommandFunctions(sourceObject, flowInstance);
        flowInstance.commandRunner.context = sourceObject;
        flowInstance.commandRunner.go();
      });
      
      return flowInstance;
    }
  };

  return FlowObject;
});