/**
 * Created by Shaun on 8/10/14.
 */

jack2d('FlowObject', ['helper', 'obj', 'CommandRunner', 'FlowPlaceholders'], function(Helper, Obj, CommandRunner, FlowPlaceholders) {
  'use strict';

  // need a results tracker. Stores results from function calls, signals when a command set is complete, etc.
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

  function processPlaceholder(commandObject, func) {
    var current = commandObject.results.current();
    var last = commandObject.results.last();

    last.commandRunners.forEach(function(commandRunner) {
      commandObject.addCommand({
        complete: true,
        func: function() {
          current.addCommand({
            func: func,
            args: [commandRunner.context]
          });
        }
      });
    });
  }

  function makeCommandFunction(commandObject, func) {
    return function() {
      var flag = true;
      var args = Helper.argsToArray(arguments);
      args.forEach(function(arg, index) {
        if(arg instanceof FlowPlaceholders.LastObjects) {
          //args[index] = commandObject.lastSourceObjects;
          processPlaceholder(commandObject, func);
          flag = false;
        } /*else if(arg instanceof FlowPlaceholders.LastObject) {
          args[index] = commandObject.lastSourceObjects[0];
        }*/
      });

      if(flag) {
        commandObject.addCommand({
          func: func,
          args: args
        });
      }

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

  function createCommandRunners(sourceObjects) {
    var commandRunner, commandRunners = [];
    sourceObjects.forEach(function(sourceObject) {
      commandRunner = new CommandRunner(sourceObject);
      commandRunners.push(commandRunner);
    });
    return commandRunners;
  }

  function executeCommandRunners(commandRunners) {
    commandRunners.forEach(function(commandRunner) {
      commandRunner.execute();
    });
  }

  var Results = {
    add: function(sourceObjects, commandRunners) {
      this.sets = Helper.def(this.sets, []);
      this.count = (Helper.isDefined(this.count)) ? this.count + 1 : 0;
      this.sets.push({
        commandRunners: commandRunners,
        sourceObjects: sourceObjects,
        addCommand: function(command) {
          this.commandRunners.forEach(function(commandRunner) {
            commandRunner.add(command);
          });
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

  return {
    init: function(sourceObjects, count, idle) {
      var commandRunners,
        results = this.results = Obj.clone(Results);

      sourceObjects = processSourceObjects(sourceObjects, count);
      commandRunners = createCommandRunners(sourceObjects);
      results.add(sourceObjects, commandRunners);

      attachCommandFunctions(sourceObjects[0], this); // TODO: investigate need for [0]

      //this.commandRunner = new CommandRunner();
      if(!idle) {
        //this.commandRunner.execute();
        executeCommandRunners(commandRunners);
      }

      return this;
    },
    isComplete: function() {
      //return (this.commandRunner.commandQueue.length === 0);
    },
    /*addCommand: function(command) {
      var contexts = this.sourceObjects,
        commandRunner = this.commandRunner;

      contexts.forEach(function(context, index) {
        command.context = context;
        command.contextIndex = index;
        commandRunner.add(command);
      });
    },*/
    addCommand: function(command) {
      this.results.current().addCommand(command);
    },
    include: function(flowObject) {
      //this.commandRunner.add(flowObject.commandRunner.commandQueue);
      this.addCommand(flowObject.commandRunner.commandQueue); //FIXME
      return this;
    },
    next: function(sourceObjects, count) {
      var commandRunners, results = this.results;
      //this.lastSourceObjects = this.sourceObjects;
      //this.lastCommandRunners = this.commandRunners;
      removeCommandFunctions(results.current().sourceObjects[0], this);

      sourceObjects = processSourceObjects(sourceObjects, count);
      commandRunners = createCommandRunners(sourceObjects);
      results.add(sourceObjects, commandRunners);

      attachCommandFunctions(sourceObjects[0], this);
      executeCommandRunners(commandRunners);
      return this;
    },
    done: function() {
      /*this.commandRunner.add({
        done: true
      });*/
      this.addCommand({done: true});
      return this;
    },
    /*each: function(func) {
      var sourceObjects = this.sourceObjects;
      this.call(function() {
        sourceObjects.forEach(function(sourceObject) {
          func(sourceObject);
        });
      });
      return this;
    },*/
    get: function(func) {
      var args = Array.prototype.slice.call(arguments, 1);
      this.addCommand({
        func: func,
        contextAsArg: true,
        args: args
      });
      return this;
    },
    lastOnComplete: function(func) {
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
    getLast: function(func) {
      this.addCommand({
        func: func,
        args: this.results.last().sourceObjects
      });
      return this;
    },
    // TODO:
    watch: function(prop) {
      this.addCommand({
        watchProp: prop,
        lastValue: null, // FIXED... hopefully <-- doesn't work because values vary between sourceObjects
        ands: []
      });
      return this;
    },
    whenGroup: function(prop, value) {
      return this.when(prop, value, true);
    },
    when: function(prop, value, group) {
      value = Helper.def(value, true);

      this.addCommand({
        whenProp: prop,
        whenValue: value,
        isFunc: Helper.isFunction(value),
        ands: [],
        commands: [],
        group: group
      });
      return this;
    },
    whenNot: function(prop) {
      return this.when(prop, false);
    },
    and: function(prop, value) {
      value = Helper.def(value, true);

      /*this.commandRunner.add({
        andProp: prop,
        andValue: value,
        isFunc: Helper.isFunction(value)
      });*/
      this.addCommand({
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
      this.addCommand({
        setProp: prop,
        setValue: value,
        inc: inc
      });
      return this;
    },
    inc: function(prop, value) {
      this.set(prop, value, true);
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
});