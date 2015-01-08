/**
 * Created by Shaun on 11/18/2014.
 */

register('CommandObject', ['Util', 'Obj', 'Injector'], function(Util, Obj, Injector) {
  'use strict';

  function addCommand(context, commandConfig) {
    context.commandRunner.add(commandConfig);
    return context;
  }

  function end() {
    return addCommand(this, {end: true});
  }

  function get(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return addCommand(this, {
      func: func,
      sourceAsArg: true,
      args: args,
      context: this
    });
  }

  function watch(prop) {
    this.end();
    return addCommand(this, {
      watchProp: prop,
      lastValue: this.commandRunner.context[prop],
      logicals: [],
      specials: []
    });
  }

  function whenGroup(prop, value) {
    this.end();
    return this.when(prop, value, true);
  }

  function endGroup() {
    return addCommand(this, {endGroup: true});
  }

  function when(prop, value, group) {
    this.end();
    return addCommand(this, {
      whenProp: prop,
      whenValue: value,
      isFunc: Util.isFunction(value),
      logicals: [],
      specials: [],
      commands: [],
      group: group
    });
  }

  function whenNot(prop) {
    this.end();
    return this.when(prop, false);
  }

  function andWhen(prop, value) {
    return addCommand(this, {
      isLogical: true,
      logicalProp: prop,
      logicalValue: value,
      logicalType: 'and',
      isFunc: Util.isFunction(value),
      specials: []
    });
  }

  function orWhen(prop, value) {
    return addCommand(this, {
      isLogical: true,
      logicalProp: prop,
      logicalValue: value,
      logicalType: 'or',
      isFunc: Util.isFunction(value),
      specials: []
    });
  }

   function on(eventName, func) {
    this.end();
    return addCommand(this, {
      eventName: eventName,
      func: func
    });
  }

  function set(objOrProp, propOrValue, value) {
    var context, prop;
    if(Util.isDefined(value)) {
      // NOTE: this is an async operation so this set() may run AFTER set() calls that follow it
      Injector.process(objOrProp, function(context) {
        addCommand(this, {
          setProp: propOrValue,
          setValue: value,
          inc: false,
          context: context
        });
      }.bind(this));

      return this;
    } else {
      return addCommand(this, {
        setProp: objOrProp,
        setValue: propOrValue,
        inc: false,
        context: context
      });
    }
  }

  function inc(prop, value, format) {
    return addCommand(this, {
      setProp: prop,
      setValue: value,
      inc: true,
      format: format
    });
  }

  function call(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return addCommand(this, {
      func: func,
      args: args
    });
  }

  function log(value) {
    return addCommand(this, {
      logValue: value
    });
  }

  function source() {
    return this.commandRunner.context;
  }

  return {
    commandRunner: null,
    logicMode: '',
    end: end,
    get: get,
    watch: watch,
    whenGroup: whenGroup,
    endGroup: endGroup,
    when: when,
    whenNot: whenNot,
    andWhen: andWhen,
    orWhen: orWhen,
    set: set,
    inc: inc,
    on: on,
    call: call,
    log: log,
    source: source
  };
});
