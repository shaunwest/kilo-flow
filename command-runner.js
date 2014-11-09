/**
 * Created by Shaun on 9/11/14.
 */

// Got rid of 'commandQueue'. Command Runners no longer wait for promises.
jack2d('CommandRunner', ['helper', 'chrono'], function(Helper, Chrono) {
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
    this.conditional = null;
    this.specialQueue = null;
  }

  CommandRunner.prototype.add = function(command) {
    if(command.setProp) {
      command.context = getLastObject(this.context, command.setProp);
      command.setProp = getLastProp(command.setProp);
    }
    this.evaluateCommand(command);
  };

  CommandRunner.prototype.evaluateCommand = function(command) {
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

  CommandRunner.prototype.repeatQueue = function() {
    var repeatQueue = [];

    if(this.chronoId) {
      Chrono.registerAfter(this.chronoId, function() {
        this.processRepeatCommands(repeatQueue);
      }.bind(this), Helper.getGID('command-repeat'));

    } else {
      Chrono.register(function() {
        this.processRepeatCommands(repeatQueue);
      }.bind(this), Helper.getGID('command-repeat'));
    }

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
      } else if(command.endGroup) {
        groupConditional = null;
      } else if(command.whenProp || command.watchProp) {
        conditional = command;
        conditional.ands.length = 0;
        conditional.specials.length = 0;
      } else if(conditional && command.andProp) {
        conditional.ands.push(command);
      } else if(conditional && command.isLogical) {
        conditional.ands.push(command);
      } else if(conditional && command.specialCondition) {
        if(conditional.ands.length > 0) {
          conditional.ands[conditional.ands.length - 1].specials.push(command);
        } else {
          conditional.specials.push(command);
        }
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
      //conditional.whenProp && conditional.whenValue && (context[conditional.whenProp] === conditional.whenValue) ||
      conditional.whenProp && Helper.isDefined(context[conditional.whenProp])
    ) {
      if(conditional.specials.length > 0 && !this.evaluateSpecials(conditional.specials, conditional.whenProp)) {
        return false;
      }
      /*if(conditional.ands.length > 0 && !this.evaluateAnd(conditional.ands, context)) { // TODO: get rid of context
        return false;
      }*/
      if(conditional.ands.length > 0 && !this.evaluateLogical(conditional.ands, conditional.whenProp || conditional.watchProp)) {
        return false;
      }
      return true;
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
        //if(context[and.andProp] !== and.andValue) {
        if(!Helper.isDefined(context[and.andProp])) {
          return false;
        }
      }

      if(and.specials.length > 0 && !this.evaluateSpecials(and.specials, and.andProp)) {
        return false;
      }
    }
    return true;
  };

  CommandRunner.prototype.evaluateLogical = function(logicals, logicalProp) {
    var numLogicals, logical, logicalType, i;
    var logicState = false;
    var context = this.context;

    for(i = 0, numLogicals = logicals.length; i < numLogicals; i++) {
      logical = logicals[i];
      logicalType = logical.logicalType;
      logicalProp = logical.logicalProp || logicalProp;
      console.log(logicalProp);
      if(logical.isFunc) {
        if(logical.logicalValue(context[logicalProp])) {
          if(logicalType === 'and') {
            logicState = true;
          } else {
            return true;
          }
        } else {
          logicState = false;
        }
      } else {
        if(Helper.isDefined(context[logicalProp])) {
          if(logicalType === 'and') {
            logicState = true;
          } else {
            return true;
          }
        } else {
          logicState = false;
        }
      }

      if(logical.specials.length > 0 && this.evaluateSpecials(logical.specials, logicalProp)) {
        if(logicalType === 'and') {
          logicState = true;
        } else {
          return true;
        }
      } else {
        logicState = false;
      }
    }
    return logicState;
  };

  CommandRunner.prototype.evaluateSpecials = function(specials, conditionalProp) {
    var numSpecials, special, i;
    var context = this.context;

    for(i = 0, numSpecials = specials.length; i < numSpecials; i++) {
      special = specials[i];
      switch(special.type) {
        case '<':
          if(context[conditionalProp] >= special.value) {
            return false;
          }
          break;
        case '<=':
          if(context[conditionalProp] > special.value) {
            return false;
          }
          break;
        case '>':
          if(context[conditionalProp] <= special.value) {
            return false;
          }
          break;
        case '>=':
          if(context[conditionalProp] < special.value) {
            return false;
          }
          break;
        case '==':
          if(context[conditionalProp] !== special.value) {
            return false;
          }
          break;
        default: // do nothing
      }
    }
    return true;
  };

  CommandRunner.prototype.executeCommand = function(command) {
    var context = this.context, result, prop, propVal;

    if(command.complete) { // FIXME
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
      command.func.apply(command.context || context, command.args);
    } else if(command.setProp) {
      prop = command.setProp;
      if(command.inc) {
        if(command.format === 'px') {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue + 'px';
          } else {
            propVal = command.context[prop];
            command.context[prop] = parseInt(propVal) + command.setValue + 'px';
          }
        } else if(command.format === '%') {
          if(!command.context[prop]) {
            command.context[prop] = command.setValue + '%';
          } else {
            propVal = command.context[prop];
            command.context[prop] = parseInt(propVal) + command.setValue + '%';
          }
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