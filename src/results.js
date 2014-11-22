/**
 * Created by Shaun on 11/18/2014.
 */

kilo('Results', ['Util'], function(Util) {
  'use strict';

  return {
    add: function(sourceObjects, commandRunners) {
      this.sets = Util.def(this.sets, []);
      this.count = (Util.isDefined(this.count)) ? this.count + 1 : 0;
      this.sets.push({
        commandRunners: commandRunners,
        sourceObjects: sourceObjects,
        addCommand: function(command, index) {
          var commandRunners = this.commandRunners;
          if(Util.isDefined(index) && index < commandRunners.length) {
            commandRunners[index].add(command);
          } else {
            commandRunners.forEach(function(commandRunner) {
              commandRunner.add(command);
            });
          }
        }
      });
    },
    get: function(index) {
      return this.sets[index];
    },
    current: function() {
      return this.sets[this.count];
    },
    next: function() {
      return this.sets[this.count + 1];
    },
    last: function() {
      return this.sets[this.count - 1];
    }
  };
});
