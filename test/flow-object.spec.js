// flow-object.spec.js

describe('Flow Object', function() {
  var myObj, TIMEOUT = 50;

  beforeEach(function() {
    mixin = kilo('Mixin');
    myObj = mixin(['FlowObject', {
      trigger: undefined,
      foo: {
        bar: false   
      }
    }]);
  });

  describe('properties', function() {
    beforeEach(function(done) {
      myObj.when('trigger', true)
      .set('baz', true)
      .set('foo.bar', true);

      setTimeout(function() {
        myObj.trigger = true; 
        setTimeout(done, TIMEOUT);
      }, TIMEOUT);
    });

    it('should be true when trigger is true', function() {
      expect(myObj.baz).toBe(true);
      expect(myObj.foo.bar).toBe(true);
    });
  });
});