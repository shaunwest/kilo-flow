/**
 * Created by Shaun on 9/11/14.
 */

kilo('CommandRunner', ['Util', 'Scheduler'], function(Util, Scheduler) {
  'use strict';

  function getLastObject(obj, propStr) {
    var props = propStr.split('.');
    if(props.length === 1) {
      return obj;
    }
    return getObject(obj, props);

    function getObject(obj, props) {
      if(!obj) {
        return obj;
      } else if(props.length === 2) {
        return obj[props[0]];
      } else {
        return getObject(obj[props[0]], props.slice(1));
      }
    }
  }

  function getLastProp(propStr) {
    return propStr.split('.').slice(-1)[0];
  }

  function CommandRunner(context, chronoId) {
    this.chronoId = chronoId;
    this.context = context;
    this.running = false;
    this.conditional = null;
    this.waitQueue = [];
    this.specialQueue = null;
  }

  CommandRunner.prototype.add = function(command) {
    if(!this.running) {
      this.waitQueue.push(command);   
    } else {
      command = this.preProcessCommand(command);
      this.evaluateCommand(command);
    }
  };

  CommandRunner.prototype.go = function() {
    this.running = true;
    this.evaluateCommands();
  };


  CommandRunner.prototype.preProcessCommand = function(command) {
    if(command.setProp) {
      command.context = getLastObject(command.context || this.context, command.setProp);
      command.setProp = getLastProp(command.setProp);
    }
    else if(command.whenProp) {
      command.context = getLastObject(this.context, command.whenProp);
      command.whenProp = getLastProp(command.whenProp);
    }
    else if(command.watchProp) {
      command.context = getLastObject(this.context, command.watchProp);
      command.whenProp = getLastProp(command.watchProp);
    }
    else if(command.logicalProp) {
      command.context = getLastObject(this.context, command.logicalProp);
      command.logicalProp = getLastProp(command.logicalProp);
    }
    else if(command.eventName) {
      command.context = getLastObject(this.context, command.eventName);
      command.eventName = getLastProp(command.eventName);
    }

    return command;
  };

  CommandRunner.prototype.evaluateCommands = function() {
    var command, waitQueue;
 
    waitQueue = this.waitQueue;

    while(command = waitQueue.shift()) {
      command = this.preProcessCommand(command);
      this.evaluateCommand(command);
    }
  };

  CommandRunner.prototype.evaluateCommand = function(command) {
    if(command.whenProp || command.watchProp) {
      if(!this.specialQueue) {
        this.specialQueue = this.repeatQueue();
      }
      this.specialQueue.push(command);
    } else if(command.eventName) {
      this.specialQueue = this.eventQueue(command);
    } else if(command.end) {
      this.specialQueue = null;
    } else if(this.specialQueue) {
      this.specialQueue.push(command);
    } else {
      return this.executeCommand(command);
    }
    return null;
  };

  CommandRunner.prototype.repeatQueue = function() {
    var repeatQueue = [];

    if(this.chronoId) {
      Scheduler.registerAfter(this.chronoId, function() {
        this.processRepeatCommands(repeatQueue);
      }.bind(this), Util.getGID('command-repeat'));

    } else {
      Scheduler.register(function() {
        this.processRepeatCommands(repeatQueue);
      }.bind(this), Util.getGID('command-repeat'));
    }

    return repeatQueue;
  };

  CommandRunner.prototype.eventQueue = function(command) {
    var eventQueue = [], context = command.context; // || this.context;
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
      } else if(command.endGroup) {
        groupConditional = null;
      } else if(command.whenProp || command.watchProp) {
        conditional = command;
        conditional.logicals.length = 0;
      } else if(conditional && command.isLogical) {
        conditional.logicals.push(command);
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

  CommandRunner.prototype.checkWatch = function(command) {
    var context = command.context; //this.context;
    if(context[command.watchProp] !== command.lastValue) {
      command.lastValue = context[command.watchProp];
      return true;
    }
    return false;
  };

  CommandRunner.prototype.evaluateConditional = function(conditional) {
    var context = conditional.context; //this.context;
    if((conditional.isFunc && conditional.whenValue.call(context, context[conditional.whenProp])) ||
      (conditional.watchProp && this.checkWatch(conditional, context)) ||
      conditional.whenProp && Util.isDefined(conditional.whenValue) && (context[conditional.whenProp] === conditional.whenValue) ||
      conditional.whenProp && !Util.isDefined(conditional.whenValue) && Util.isDefined(context[conditional.whenProp])
    ) {
      if(conditional.logicals.length > 0) {
        return this.evaluateLogical(conditional.logicals, conditional.whenProp || conditional.watchProp, true);
      }
      return true;
    }
    if(conditional.logicals.length > 0) {
      return this.evaluateLogical(conditional.logicals, conditional.whenProp || conditional.watchProp, false);
    }
    return false;
  };

  CommandRunner.prototype.evaluateLogical = function(logicals, logicalProp, logicState) {
    var numLogicals, logical, logicalType, i;
    var context; // = this.context;

    for(i = 0, numLogicals = logicals.length; i < numLogicals; i++) {
      logical = logicals[i];
      logicalType = logical.logicalType;
      logicalProp = logical.logicalProp || logicalProp;
      context = logical.context;
      if(logical.isFunc) {
        if(logical.logicalValue.call(context, context[logicalProp])) {
          if(logicalType === 'or') {
            return true;
          }
        } else if(logicalType === 'and') {
          logicState = false;
        }
      } else {
        if(Util.isDefined(context[logicalProp])) {
          if(logicalType === 'or') {
            return true;
          }
        } else if(logicalType === 'and') {
          logicState = false;
        }
      }
    }
    return logicState;
  };

  CommandRunner.prototype.executeCommand = function(command) {
    var context = command.context, //this.context,
     result, prop, propVal;

    if(command.eventName) {
      if(context.addEventListener) {
        context.addEventListener(command.eventName, command.func);
      }
    } else if(command.func) {
      if(command.sourceAsArg) {
        command.args.unshift(context);
      }
      command.func.apply(command.context || context, command.args);
    } else if(command.setProp) {
      prop = command.setProp;
      if(command.inc) {
        // PX
        if(command.format === 'px') {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue + 'px';
          } else {
            propVal = command.context[prop];
            command.context[prop] = parseInt(propVal) + command.setValue + 'px';
          }

        // %
        } else if(command.format === '%') {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue + '%';
          } else {
            propVal = command.context[prop];
            command.context[prop] = parseInt(propVal) + command.setValue + '%';
          }
        // OTHER          
        } else {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue;
          }
          command.context[prop] += command.setValue;
        }
      } else {
        command.context[prop] = command.setValue;
      }
    }
    return result;
  };

  return CommandRunner;
});