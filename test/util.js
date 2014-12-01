function makeTimeout(func, cb, wait) {
  var newFunc = function() {
    if(!func()) {
      setTimeout(newFunc, wait || 100);
    } else {
      cb();
    }
  };
  return newFunc;
}