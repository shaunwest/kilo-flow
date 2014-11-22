/**
 * Created by Shaun on 11/18/2014.
 */

kilo('FlowFunc', ['Util'], function(Util) {
  'use strict';

  function containsProp(prop, targetObject) {
    return (Object.keys(targetObject).indexOf(prop) !== -1); // TODO: add indexOf polyfill
  }

  function attachCommandFunction(funcName, func, destinationObject) {
    // add to command runner
  }

  // attach "queued" function calls
  return {
    attachCommandFunctions: function(sourceObject, destinationObject) {
      Object.keys(sourceObject).forEach(function (prop) {
        if (!Util.isFunction(sourceObject[prop]) || containsProp(prop, FlowObject)) {
          return;
        }

        if (!destinationObject.__savedFunctions) {
          destinationObject.__savedFunctions = {};
        }
        destinationObject.__savedFunctions[prop] = sourceObject[prop];
        destinationObject[prop] = attachCommandFunction(prop, sourceObject[prop], destinationObject);
      });
    },
    attachCommandFunction: attachCommandFunction
  };
});