/**
 * Created by Shaun on 11/18/2014.
 */

kilo(['Func'], function(Func) {
  'use strict';

  // Hmmm... these aren't initialized when they're needed... they're initialized immediately when this
  // containing function executes... normally we don't want to execute code that might not be
  // needed, tho these are very small functions and they're pretty fundamental to Flow operations...
  return {
    greaterThan: Func.fastPartial(function(compare, val) {
      return val > compare;
    }),
    lessThan: Func.fastPartial(function(compare, val) {
      return val < compare;
    }),
    between: Func.fastPartial(function(compare1, compare2, val) {
      return (compare1 < val && val < compare2);
    }),
    greaterThanOrEqual: Func.fastPartial(function(compare, val) {
      return val >= compare;
    }),
    lessThanOrEqual: Func.fastPartial(function(compare, val) {
      return val <= compare;
    }),
    betweenInclusive: Func.fastPartial(function(compare1, compare2, val) {
      return (compare1 <= val && val <= compare2);
    }),
    outside: Func.fastPartial(function(compare1, compare2, val) {
      return (val < compare1 && val > compare2);
    }),
    and: Func.fastPartial(function() {
      // val = last arg
      // for each func, pass in val
    })
  };
});
