/**
 * Created by Shaun on 9/11/14.
 */

jack2d('CommandRunner', ['helper', 'chrono'], function(Helper, Chrono) {
  'use strict';

  function CommandRunner() {
    this.conditional = null;
    this.repeatQueue = null;
    this.running = false;
    this.commandQueue = [];
  }

  CommandRunner.prototype.execute = function() {
    this.running = true;
    Chrono.register(function() {
      this.processCommands(this.commandQueue);
    }.bind(this));
  };

  CommandRunner.prototype.add = function(commandOrArray) {
    var commandQueue = this.commandQueue;
    if(Helper.isArray(commandOrArray)) {
      commandOrArray.forEach(function(command) {
        commandQueue.push(command);
      });
    } else {
      commandQueue.push(commandOrArray);
    }
  };

  CommandRunner.prototype.repeat = function() {
    var repeatQueue = [];
    Chrono.register(function() {
      this.processRepeatCommands(repeatQueue);
    }.bind(this));
    return repeatQueue;
  };

  CommandRunner.prototype.processCommands = function(commandQueue) {
    var numCommands, command, result, i = 0;

    numCommands = commandQueue.length;

    while(i < numCommands) {
      command = commandQueue.shift();

      result = this.evaluateCommand(command);
      // if the command is returned, save it back to the list
      if(result) {
        commandQueue.push(result);
      }
      i++;
    }
  };

  CommandRunner.prototype.processRepeatCommands = function(commandQueue) {
    var numCommands, command, conditional = null,
      groupConditional = null, i = 0;

    numCommands = commandQueue.length;

    while(i < numCommands) {
      command = commandQueue.shift();
      if(command.group) {
        groupConditional = command;
      } else if(command.whenProp) {
        conditional = command;
        conditional.ands.length = 0;
      } else if(conditional && command.andProp) {
        conditional.ands.push(command);
      } else if(groupConditional) {
        if(this.evaluateConditional(groupConditional)) {
          if(conditional && this.evaluateConditional(conditional)) {
            this.executeCommand(command);
          }
        }
      } else if(conditional && this.evaluateConditional(conditional)) {
        this.executeCommand(command);
      }
      commandQueue.push(command);
      i++;
    }
  };

  CommandRunner.prototype.evaluateCommand = function(command) {
    if(!this.running) {
      return command;
    }
    if(command.whenProp) {
      if(!this.repeatQueue) {
        this.repeatQueue = this.repeat();
      }
      this.repeatQueue.push(command);
    } else if(command.done) {
      this.repeatQueue = null;
    } else if(this.repeatQueue) {
      this.repeatQueue.push(command);
    } else {
      this.executeCommand(command);
    }
    return null;
  };

  CommandRunner.prototype.evaluateConditional = function(conditional) {
    var context = conditional.context;

    if((conditional.isFunc && conditional.whenValue(context[conditional.whenProp])) ||
      context[conditional.whenProp] === conditional.whenValue) {
      return !(conditional.ands && !this.evaluateAnd(conditional.ands, context));
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
    var result, context, prop;

    if(command.func) {
      result = command.func.apply(command.context, command.args);
      if(result && result.then) {
        this.running = false;
        result.then(function(data) {
          this.running = true;
        }.bind(this));
      }
    } else if(command.setProp) {
      context = command.context;
      prop = command.setProp;
      if(command.inc) {
        if(!context[prop]) {
          context[prop] = 0;
        }
        context[prop] += command.setValue;
      } else {
        context[prop] = command.setValue;
      }
    }
    return result;
  };

  return CommandRunner;
});