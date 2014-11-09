/**
 * Created by Shaun on 8/10/14.
 */

march('FlowObject', ['helper', 'obj', 'CommandRunner'], function(Helper, Obj, CommandRunner) {
  'use strict';

  function containsProp(prop, targetObject) {
    return (Object.keys(targetObject).indexOf(prop) !== -1); // TODO: add indexOf polyfill
  }

  function attachCommandFunctions(sourceObject, commandObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Helper.isFunction(sourceObject[prop]) || containsProp(prop, FlowObject)) {
        return;
      }

      if(!commandObject.__savedFunctions) {
        commandObject.__savedFunctions = {};
      }
      commandObject.__savedFunctions[prop] = sourceObject[prop];
      commandObject[prop] = makeCommandFunction(commandObject, sourceObject[prop]);
    });
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
      if(!Helper.isFunction(sourceObject[prop])) {
        return;
      }
      delete commandObject[prop];
    });
  }

  function makeCommandFunction(commandObject, func) {
    return function() {
      var args = Helper.argsToArray(arguments);
      commandObject.addCommand({
        func: func,
        args: args
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

  function makeConditionalCommand(commandObject, type, value) {
    commandObject.addCommand({
      specialCondition: true,
      type: type,
      value: value
    });
  }

  var Results = {
    add: function(sourceObjects, commandRunners) {
      this.sets = Helper.def(this.sets, []);
      this.count = (Helper.isDefined(this.count)) ? this.count + 1 : 0;
      this.sets.push({
        commandRunners: commandRunners,
        sourceObjects: sourceObjects,
        addCommand: function(command, index) {
          var commandRunners = this.commandRunners;
          if(Helper.isDefined(index) && index < commandRunners.length) {
            commandRunners[index].add(command);
          } else {
            commandRunners.forEach(function(commandRunner) {
              commandRunner.add(command);
            });
          }
        }
      });
    },
    get: function(index) {
      return this.sets[index];
    },
    current: function() {
      return this.sets[this.count];
    },
    next: function() {
      return this.sets[this.count + 1];
    },
    last: function() {
      return this.sets[this.count - 1];
    }
  };

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
    instance: function(sourceObject) {
      var commandRunners, results = sourceObject.results = Obj.clone(Results);
      commandRunners = createCommandRunners([sourceObject]);
      results.add([sourceObject], commandRunners);
      attachCommandFunctions(sourceObject, sourceObject);
      sourceObject = Obj.merge(CommandObject, sourceObject);
      sourceObject.sourceIndex = 0;
      return sourceObject;
    }
  };

  var CommandObject = {
    flowEnd: function() {
      return this.results.current().sourceObjects[0];
    },
    addCommand: function(command) {
      this.results.current().addCommand(command);
    },
    include: function(flowDefinition) {
      this.get(function(sourceObject) {
        var flowObject = flowDefinition(sourceObject);
        this.addCommand(flowObject.results.current().commandRunners[0].commandQueue);
      });
      return this;
    },
    next: function(sourceObjects, count) {
      var flowObject = Obj.create(FlowObject);
      return flowObject.source(sourceObjects, count, this.hookId, this.results);
    },
    done: function() { //TODO: change to 'end'
      this.addCommand({done: true});
      return this;
    },
    get: function(func) {
      var args = Array.prototype.slice.call(arguments, 1);
      this.addCommand({
        func: func,
        sourceAsArg: true,
        args: args,
        context: this
      });
      return this;
    },
    getOne: function(func) {
      var args = Array.prototype.slice.call(arguments, 1);
      var current = this.results.current();

      this.sourceIndex = (this.sourceIndex >= current.sourceObjects.length) ? 0 : this.sourceIndex + 1;

      current.addCommand({
        func: func,
        sourceAsArg: true,
        args: args,
        context: this
      }, this.sourceIndex);
      return this;
    },
    getLast: function(func) {
      var commandObject = this;
      var current = commandObject.results.current();
      var last = commandObject.results.last();

      last.commandRunners.forEach(function(commandRunner) {
        commandRunner.add({
          complete: true,
          func: function() {
            current.addCommand({
              func: func,
              args: [commandRunner.context]
            });
          }
        });
      });
      return this;
    },
    watch: function(prop) {
      this.addCommand({
        watchProp: prop,
        lastValue: null, // FIXED... hopefully -- doesn't work because values vary between sourceObjects
        ands: [],
        specials: []
      });
      return this;
    },
    whenGroup: function(prop, value) {
      return this.when(prop, value, true);
    },
    endGroup: function() {
      this.addCommand({endGroup: true});
      return this;
    },
    when: function(prop, value, group) {
      //value = Helper.def(value, true); // if no value is provided, assume 'true'
      this.addCommand({
        whenProp: prop,
        whenValue: value,
        isFunc: Helper.isFunction(value),
        ands: [],
        specials: [],
        commands: [],
        group: group
      });
      return this;
    },
    lessThan: function(value) {
      makeConditionalCommand(this, '<', value);
      return this;
    },
    lessThanOrEqualTo: function(value) {
      makeConditionalCommand(this, '<=', value);
      return this;
    },
    greaterThan: function(value) {
      makeConditionalCommand(this, '>', value);
      return this;
    },
    greaterThanOrEqualTo: function(value) {
      makeConditionalCommand(this, '>=', value);
      return this;
    },
    equalTo: function(value) {
      makeConditionalCommand(this, '==', value);
      return this;
    },
    whenNot: function(prop) {
      return this.when(prop, false);
    },
    /*and: function(prop, value) {
      value = Helper.def(value, true);
      this.addCommand({
        andProp: prop,
        andValue: value,
        isFunc: Helper.isFunction(value),
        specials: []
      });
      return this;
    },*/
    andWhen: function(prop, value) {
      this.addCommand({
        isLogical: true,
        logicalProp: prop,
        logicalValue: value,
        logicalType: 'and',
        isFunc: Helper.isFunction(value),
        specials: []
      });
      return this;
    },
    and: function() {
      return this.andWhen();
    },
    orWhen: function(prop, value) {
      this.addCommand({
        isLogical: true,
        logicalProp: prop,
        logicalValue: value,
        logicalType: 'or',
        isFunc: Helper.isFunction(value),
        specials: []
      });
      return this;
    },
    or: function() {
      return this.orWhen();
    },
    andNot: function(prop) {
      return this.and(prop, false);
    },
    set: function(prop, value, inc, format) {
      this.addCommand({
        setProp: prop,
        setValue: value,
        inc: inc,
        format: format
      });
      return this;
    },
    inc: function(prop, value, format) {
      this.set(prop, value, true, format);
      return this;
    },
    on: function(eventName) {
      this.addCommand({
        eventName: eventName
      });
      return this;
    },
    call: function(func) {
      var args = Array.prototype.slice.call(arguments, 1);
      this.addCommand({
        func: func,
        args: args
      });
      return this;
    }
  };

  return FlowObject;
});