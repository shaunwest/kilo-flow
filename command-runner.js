/**
 * Created by Shaun on 9/11/14.
 */

jack2d('CommandRunner', ['chrono', 'CommandQueue'], function(Chrono, CommandQueue) {
  'use strict';

  function CommandRunner(commandList) {
    this.conditional = null;
    this.running = true;
    this.commandQueue = new CommandQueue();
    console.log('main command chrono');
    Chrono.register(function() {
      this.processCommands(this.commandQueue);
    }.bind(this));
  }

  CommandRunner.prototype.add = function(command) {
    this.commandQueue.set(command);
  };

  CommandRunner.prototype.repeat = function() {
    var repeatQueue = new CommandQueue();
    console.log('repeat chrono');
    Chrono.register(function() {
      this.processRepeatCommands(repeatQueue);
    }.bind(this));
    return repeatQueue;
  };

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

  CommandRunner.prototype.processRepeatCommands = function(commandList) {
    var numCommands, command, conditional = null, i = 0;

    numCommands = commandList.count();

    while(i < numCommands) {
      command = commandList.get();
      if(command.whenProp) {
        conditional = command;
        conditional.ands.length = 0;
      } else if(conditional && command.andProp) {
        conditional.ands.push(command);
      } else {
        if(this.evaluateConditional(conditional)) {
          this.executeCommand(command);
        }
      }
      commandList.set(command);
      i++;
    }
  };

  CommandRunner.prototype.evaluateCommand = function(command) {
    if(command.whenProp) {
      if(!this.repeatQueue) {
        this.repeatQueue = this.repeat();
      }
      this.repeatQueue.set(command);
    } else if(command.done) {
      this.repeatQueue = null;
    } else if(this.repeatQueue) {
      this.repeatQueue.set(command);
    } else if(this.running) {
      this.executeCommand(command);
    } else {
      return command;
    }
    return null;
  };

 /* CommandRunner.prototype.evaluateCommand = function(command) {
    if(command.whenProp) {
      this.conditional = command;
      this.conditional.ands.length = 0;
    } else if(command.andProp && this.conditional) {
      this.conditional.ands.push(command);
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
  };*/

  CommandRunner.prototype.evaluateConditional = function(conditional) {
    var context = conditional.context;

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
      result = command.func.apply(command.context, command.args);
      if(result && result.then) {
        this.running = false;
        result.then(function(data) {
          this.running = true;
        }.bind(this));
      }
    } else if(command.setProp) {
      command.context[command.setProp] = command.setValue;
    }
    return result;
  };

  return CommandRunner;
});