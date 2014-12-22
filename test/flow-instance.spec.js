describe('Flow instance', function() {
  var Flow, Watch, When, On, TIMEOUT = 50;

  kilo.log = false;

  beforeEach(function(done) {
    use(['Flow', 'Flow.Watch', 'Flow.When', 'Flow.On', 'Flow.Model'], function(_Flow, _Watch, _When, _On, _Model) {
      Flow = _Flow;
      Watch = _Watch;
      When = _When;
      On = _On;
      Model = _Model;
      done();
    });
  });

  describe('property of simple object', function() {
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

    it('should be true when foo is defined', function() {
      expect(myObj.bar).toBe(true);
    });
  });
  
  describe('property of simple object', function() {
    var myObj;

    beforeEach(function(done) {
      myObj = {
        bar: false
      };

      When(myObj, 'foo')
        .set('bar', true);

      setTimeout(done, TIMEOUT);
    });

    it('should be false if foo is not defined', function() {
      expect(myObj.bar).toBe(false);
    });
  });

  describe('property of simple object', function() {
    var myObj;

    beforeEach(function(done) {
      myObj = {
        foo: false, 
        bar: false
      };

      When(myObj, 'foo', false)
        .set('bar', true);

      setTimeout(done, TIMEOUT);
    });

    it('should be true if foo is false', function() {
      expect(myObj.bar).toBe(true);
    });
  });

  describe('property of nested object', function() {
    var myObj;

    beforeEach(function(done) {
      myObj = {
        foo: {
          bar: true,
          baz: false
        }
      };

      When(myObj, 'foo.bar', true)
        .set('foo.baz', true);

      setTimeout(done, TIMEOUT);
    });

    it('should be true if foo is false', function() {
      expect(myObj.foo.baz).toBe(true);
    });
  });

  describe('property of object', function() {
    var myObj, myModel;

    beforeEach(function(done) {
      myObj = {
        foo: true
      };

      myModel = Model(myObj)
        .when('$.foo', true)
        .set('bar', true)
        .source();

      setTimeout(done, TIMEOUT);
    });

    it('should be true if model property is true', function() {
      expect(myModel.bar).toBe(true);
    });
  });
  describe('property of second object', function() {
    var myObj1, myObj2;

    beforeEach(function(done) {
      myObj1 = {
        foo: false
      };

      myObj2 = {
        bar: false
      };

      When(myObj1, 'foo', true)
        .set(myObj2, 'bar', true);

      myObj1.foo = true;

      setTimeout(done, TIMEOUT);
    });

    it('should be true if foo is true', function() {
      expect(myObj2.bar).toBe(true);
    });
  });

  describe('property of dependency object', function() {
    var myObj1, myObj2;

    beforeEach(function(done) {
      myObj1 = {
        foo: false
      };

      myObj2 = {
        baz: false
      };

      register('myObj2', function() {
        return myObj2;
      });
        
      When(myObj1, 'foo', true)
        .set('myObj2', 'baz', true);

      myObj1.foo = true;
      
      setTimeout(done, TIMEOUT);
    });

    afterEach(function() {
      kilo.unresolve('myObj2');      
    });

    it('should be true if foo is true', function() {
      expect(myObj2.baz).toBe(true);
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

  describe('property', function() {
    var myObj;

    beforeEach(function(done) {
      myObj = {
        foo: true, 
        bar: false
      };

      Watch(myObj, 'foo').set('bar', true);

      setTimeout(makeTimeout(function() {
        return (myObj.bar === true);
      }, done), TIMEOUT);

      myObj.foo = false;
    });

    it('should be set to true when foo changes', function() {
      expect(myObj.bar).toBe(true);
    });
  });

  describe('property', function() {
    var fooEvent, myEventTarget;

    beforeEach(function(done) {
      myEventTarget = new Image();

      On(myEventTarget, 'fooEvent').set('bar', true);

      setTimeout(makeTimeout(function() {
        return (myEventTarget.bar === true);
      }, done), TIMEOUT);

      fooEvent = document.createEvent('Event');
      fooEvent.initEvent('fooEvent', true, true);
      myEventTarget.dispatchEvent(fooEvent);
    });

    it('should be set to true when an event occurs', function() {
      expect(myEventTarget.bar).toBe(true);
    });
  });

  describe('property of model', function() {
    var fooEvent, myEventTarget, myModel;

    beforeEach(function(done) {
      myEventTarget = new Image();

      myModel = Model(myEventTarget)
      .on('$.fooEvent')
      .set('bar', true)
      .source();

      setTimeout(makeTimeout(function() {
        return (myModel.bar === true);
      }, done), TIMEOUT);

      fooEvent = document.createEvent('Event');
      fooEvent.initEvent('fooEvent', true, true);
      myEventTarget.dispatchEvent(fooEvent);
    });

    it('should be set to true when an event occurs', function() {
      expect(myModel.bar).toBe(true);
    });
  });
});