/**
 * Created by Shaun on 9/7/14.
 */

jack2d('FlowPOC', ['helper', 'obj', 'chrono'], function(Helper, Obj, Chrono) {
  'use strict';

  function FlowPOC(sourceObject, commandList) { // Factory
    var flowObject = Obj.create(FlowObject);
    flowObject.init(sourceObject, commandList);
    return flowObject;
  }

  function CommandList() {
    this.items = [];
  }

  CommandList.prototype.set = function(item) {
    this.items.push(item);
  };

  CommandList.prototype.get = function() {
    return this.items.shift();
  };

  CommandList.prototype.count = function() {
    return this.items.length;
  };

  function CommandRunner(commandList, context) {
    this.conditional = null;
    this.context = context;
    this.running = true;
    Chrono.register(function() {
      this.processCommands(commandList);
    }.bind(this));
  }

  CommandRunner.prototype.processCommands = function(commandList) {
    var numCommands, command, result, i = 0;

    numCommands = commandList.count();

    while(i < numCommands) {
      command = commandList.get();

      result = this.evaluateCommand(command);
      // if the command is returned, save it back to the list
      if(result) {
        commandList.set(result);
      }
      i++;
    }
  };

  CommandRunner.prototype.evaluateCommand = function(command) {
    if(command.whenProp) {
      this.conditional = command;
      this.conditional.ands.length = 0;

    } else if(command.andProp && this.conditional) {
      this.conditional.ands.push(command);
    /*} else if(command.next) {
      // TODO: set up next
      //FlowPOC(command.next, this.commandList);
      //this.conditional = null;
      return null;*/
    } else if(command.done) {
      this.conditional = null;

    } else {
      if(this.conditional) {
        if(this.evaluateConditional(this.conditional)) {
          this.executeCommand(command);
        }
      } else {
        if(this.running) {
          this.executeCommand(command);
          // non-conditionals get thrown out after they run
          return null;
        }
      }
    }

    return command;
  };

  CommandRunner.prototype.evaluateConditional = function(conditional) {
    var context = this.context;

    if((conditional.isFunc && conditional.whenValue(context[conditional.whenProp])) ||
      context[conditional.whenProp] === conditional.whenValue) {
      return !(conditional.ands && !this.evaluateAnd(conditional.ands, context));
      //return true;
    }
    return false;
  };

  CommandRunner.prototype.evaluateAnd = function(ands, context) {
    var numAnds, and, i;
    numAnds = ands.length;
    for(i = 0; i < numAnds; i++) {
      and = ands[i];
      if(and.isFunc) {
        if(!and.andValue(context[and.andProp])) {
          return false;
        }
      } else {
        if(context[and.andProp] !== and.andValue) {
          return false;
        }
      }
    }
    return true;
  };

  CommandRunner.prototype.executeCommand = function(command) {
    var result;
    if(command.func) {
      result = command.func.apply(this.context, command.args);
      if(result && result.then) {
        this.running = false;
        result.then(function(data) {
          this.running = true;
        }.bind(this));
      }
    } else if(command.setProp) {
      this.context[command.setProp] = command.setValue;
    }
    return result;
  };

  function attachCommandFunctions(sourceObject, commandObject) {
    Object.keys(sourceObject).forEach(function(prop) {
      if(!Helper.isFunction(sourceObject[prop])) {
        return;
      }
      commandObject[prop] = makeCommandFunction(commandObject, sourceObject[prop]);
    });
  }

  function removeCommandFunctions(sourceObject, commandObject) {
  }

  function makeCommandFunction(commandObject, func) {

    return function() {
      var commandList = commandObject.commandList;
      commandList.set({
        func: func,
        args: Helper.argsToArray(arguments)
      });
      return commandObject;
    };
  }

  var FlowObject = {
    init: function(sourceObject, commandList) {
      this.commandList = commandList || new CommandList();
      this.sourceObject = sourceObject;
      attachCommandFunctions(sourceObject, this);
      this.commandRunner = new CommandRunner(this.commandList, sourceObject);
      return this;
    },
    /*commit: function() {
      this.commandList = new CommandList();
      this.commandRunner = new CommandRunner(this.commandList, this.sourceObject);
      return this;
    },*/
    next: function(sourceObject) {
      this.sourceObject = sourceObject;
      return FlowPOC(sourceObject); //, this.commandList);
    },
    done: function() {
      this.commandList.set({
        done: true
      });
      return this;
    },
    when: function(prop, value) {
      var commandList = this.commandList;

      value = Helper.def(value, true);

      commandList.set({
        whenProp: prop,
        whenValue: value,
        isFunc: Helper.isFunction(value),
        ands: []
      });
      return this;
    },
    whenNot: function(prop) {
      return this.when(prop, false);
    },
    and: function(prop, value) {
      var commandList = this.commandList;

      value = Helper.def(value, true);

      commandList.set({
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
      this.commandList.set({
        setProp: prop,
        setValue: value,
        inc: inc
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

  return FlowPOC;
});