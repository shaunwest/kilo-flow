// flow-object.spec.js

describe('Flow Object', function() {
  var myObj, TIMEOUT = 50;

  kilo.log = false;
  
  beforeEach(function(done) {
    use('Merge', function(Merge) {
      myObj = Merge(['FlowObject', {
        trigger: undefined,
        foo: {
          bar: false   
        }
      }]);
      done();
    });
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