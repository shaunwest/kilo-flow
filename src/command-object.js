/**
 * Created by Shaun on 11/18/2014.
 */

kilo('CommandObject', ['Util'], function(Util) {
  'use strict';

  function addCommand(context, commandConfig) {
    context.commandRunner.add(commandConfig);
    return context;
  }

  function done() { //TODO: change to 'end'
    return addCommand(this, {done: true});
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
    return addCommand(this, {
      watchProp: prop,
      lastValue: null, // FIXED... hopefully -- doesn't work because values vary between sourceObjects
      logicals: [],
      specials: []
    });
  }

  function whenGroup(prop, value) {
    return this.when(prop, value, true);
  }

  function endGroup() {
    return addCommand(this, {endGroup: true});
  }

  function when(prop, value, group) {
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

  function set(prop, value, inc, format) {
    return addCommand(this, {
      setProp: prop,
      setValue: value,
      inc: inc,
      format: format
    });
  }

  function inc(prop, value, format) {
    return this.set(prop, value, true, format);
  }

  function on(eventName) {
    return addCommand(this, {
      eventName: eventName
    });
  }

  function call(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    return addCommand(this, {
      func: func,
      args: args
    });
  }

  function source() {
    return this.commandRunner.context;
  }

  return {
    commandRunner: null,
    logicMode: '',
    done: done,
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
    source: source
  };
});
