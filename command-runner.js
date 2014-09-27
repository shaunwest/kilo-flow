/**
 * Created by Shaun on 9/11/14.
 */

// TODO: refactor

jack2d('CommandRunner', ['helper', 'chrono'], function(Helper, Chrono) {
  'use strict';

  function CommandRunner(context) {
    this.context = context;
    this.conditional = null;
    this.specialQueue = null;
    this.waiting = true;
    this.commandQueue = [];
  }

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

  CommandRunner.prototype.execute = function(onComplete) {
    this.waiting = false;
    Chrono.register(function() {
      this.processCommands(this.commandQueue);
      /*if(this.commandQueue.length === 0) {
        if(onComplete) {
          onComplete();
          onComplete = null;
        }
      }*/
    }.bind(this), Helper.getGID('command-runner'));
  };

  CommandRunner.prototype.processCommands = function(commandQueue) {
    var numCommands, command, returned, i = 0;

    numCommands = commandQueue.length;


    while(i < numCommands) {
      command = commandQueue.shift();

      returned = this.evaluateCommand(command);
      if(returned) {
        commandQueue.push(returned);
      }
      i++;
    }
  };

  CommandRunner.prototype.repeatQueue = function() {
    var repeatQueue = [];

    Chrono.register(function() {
      this.processRepeatCommands(repeatQueue);
    }.bind(this), Helper.getGID('command-repeat'));

    return repeatQueue;
  };

  CommandRunner.prototype.eventQueue = function(command) {
    var eventQueue = [], context = this.context;
    var that = this;
    if(context.addEventListener) {
      context.addEventListener(command.eventName, function() {
        var i, numCommands = eventQueue.length;
        for(i = 0; i < numCommands; i++) {
          that.executeCommand(eventQueue[i]);
        }
      });
    }

    return eventQueue;
  };

  CommandRunner.prototype.processRepeatCommands = function(commandQueue) {
    var numCommands, command, conditional = null,
      groupConditional = null, i = 0;

    numCommands = commandQueue.length;

    while(i < numCommands) {
      command = commandQueue.shift();
      if(command.group) {
        groupConditional = command;
      } else if(command.whenProp || command.watchProp) {
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
      } else if(conditional) {
        if(this.evaluateConditional(conditional)) {
          this.executeCommand(command);
        }
      }
      commandQueue.push(command);
      i++;
    }
  };

  CommandRunner.prototype.evaluateCommand = function(command) {
    if(this.waiting) {
      return command;
    }
    if(command.whenProp || command.watchProp) { // FIXME: when should cancel a previous 'event'
      if(!this.specialQueue) {
        this.specialQueue = this.repeatQueue();
      }
      this.specialQueue.push(command);
    } else if(command.eventName) {
      this.specialQueue = this.eventQueue(command);
    } else if(command.done) {
      this.specialQueue = null;
    } else if(this.specialQueue) {
      this.specialQueue.push(command);
    } else {
      return this.executeCommand(command);
    }
    return null;
  };

  CommandRunner.prototype.checkWatch = function(command) {
    var context = this.context;
    if(context[command.watchProp] !== command.lastValue) {
      command.lastValue = context[command.watchProp];
      return true;
    }
    return false;
  };

  CommandRunner.prototype.evaluateConditional = function(conditional) {
    var context = this.context;
    if((conditional.isFunc && conditional.whenValue(context[conditional.whenProp])) ||
      (conditional.watchProp && this.checkWatch(conditional, context)) ||
      conditional.whenProp && (context[conditional.whenProp] === conditional.whenValue)) {
      return !(conditional.ands && !this.evaluateAnd(conditional.ands, context));
    }
    return false;
  };

  CommandRunner.prototype.evaluateAnd = function(ands) {
    var numAnds, context = this.context, and, i;
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
    var context = this.context, result, prop, args;

    if(command.complete) {
      if(this.commandQueue.length === 0) {
        command.func.apply(command); //, command.args);
      } else {
        result = command;
      }
    } else if(command.eventName) {
      if(context.addEventListener) {
        context.addEventListener(command.eventName, command.func);
      }
    } else if(command.func) {
      if(command.sourceAsArg) {
        command.args.unshift(context);
      }
      result = command.func.apply(command.context || context, command.args);
      if(result && result.then) {
        this.waiting = true;
        result.then(function(data) {
          this.waiting = false;
        }.bind(this));
      }
    } else if(command.setProp) {
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