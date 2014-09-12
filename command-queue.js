/**
 * Created by Shaun on 9/11/14.
 */

jack2d('CommandQueue', [], function() {
  'use strict';

  function CommandQueue() {
    this.items = [];
  }

  CommandQueue.prototype.set = function(item) {
    this.items.push(item);
  };

  CommandQueue.prototype.get = function() {
    return this.items.shift();
  };

  CommandQueue.prototype.count = function() {
    return this.items.length;
  };

  return CommandQueue;
});