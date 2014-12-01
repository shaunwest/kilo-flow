describe('Flow instance', function() {
  var Flow, TIMEOUT = 50;

  beforeEach(function() {
    Flow = kilo('Flow');
  });

  describe('property', function() {
    var myObj, flowObj;

    beforeEach(function(done) {
      myObj = {
        foo: false,
        bar: false
      };

      flowObj = Flow(myObj);
      flowObj
        .when('foo')
        .set('bar', true);

      setTimeout(done, TIMEOUT);
    });

    it('should be true if foo is defined', function() {
      expect(myObj.bar).toBe(true);
    });
  });
  
  describe('property', function() {
    var myObj, flowObj;

    beforeEach(function(done) {
      myObj = {
        bar: false
      };

      flowObj = Flow(myObj);
      flowObj
        .when('foo')
        .set('bar', true);

      setTimeout(done, TIMEOUT);
    });

    it('should be false if foo is not defined', function() {
      expect(myObj.bar).toBe(false);
    });
  });

  describe('property', function() {
    var myObj, flowObj;

    beforeEach(function(done) {
      myObj = {
        foo: false, 
        bar: false
      };

      flowObj = Flow(myObj);
      flowObj
        .when('foo', false)
        .set('bar', true);

      setTimeout(done, TIMEOUT);
    });

    it('should be true if foo is false', function() {
      expect(myObj.bar).toBe(true);
    });
  });

  describe('incremented property', function() {
    var myObj, flowObj;

    beforeEach(function(done) {
      myObj = {
        doInc: false,
        bar: 0
      };

      flowObj = Flow(myObj);
      flowObj
        .when('doInc')
        .inc('bar', 1);

      setTimeout(makeTimeout(function() {
        return (myObj.bar > 10);
      }, done), TIMEOUT);
    });

    it('should be greater than 10', function() {
      expect(myObj.bar).toBeGreaterThan(10);
    });
  });
});