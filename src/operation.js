const delayms = 1;
const expectedCity = "New York, NY";
const expectedWeather = {temp: 50};
const expectedForecast = {fiveDay: [60, 70, 80, 45, 50]};

function getCurrentCity(callback) {
  setTimeout(function () {

    const city = expectedCity;
    callback(null, city);

  }, delayms)
}

function getWeather(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get weather"));
      return;
    }

    const weather = expectedWeather;

    callback(null, weather)

  }, delayms)
}

function getForecast(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get forecast"));
      return;
    }

    const fiveDay = expectedForecast;

    callback(null, fiveDay)

  }, delayms)
}

suite.only("operations");

function fetchCurrentCity() {
  const operation = Operation();
  getCurrentCity(operation.nodeCallback);
  return operation;
}

function fetchWeather(city){
  const operation = Operation();
  getWeather(city, operation.nodeCallback);
  return operation;
}

function fetchForecast(city){
  const operation = Operation();
  getForecast(city, operation.nodeCallback);
  return operation;
}

function Operation(){
  const operation = {
    successReactions: [],
    errorReactions: [],
    state: "pending",
    result: undefined,
    error: undefined
  };

  operation.nodeCallback = function(error, result){
    if (error) {
      operation.fail(error);
      return;
    }
    operation.succeed(result);
  };
  operation.fail = function fail(error){
      operation.state = "failed";
      operation.error = error;
      operation.errorReactions.forEach(r => r(error));
  };
  operation.succeed = function succeed(result){
      operation.state = "succeeded";
      operation.result = result;
      operation.successReactions.forEach(r => r(result));
  };

  operation.onFailure = function onFailure(onError){
      return operation.then(null, onError);
  };

  operation.onCompletion = function onCompletion(onSuccess, onError){
    const noop = function() {};
    const proxyOp = new Operation();
    
    // Wraps the successHandler so we can forward the result
    function successHandler(){
      if(onSuccess){
          let callbackResult;
          try {
              callbackResult = onSuccess(operation.result);
          } catch (error) {
              proxyOp.fail(error);
              return;
          }
        // If the result is an OP, then sync the ops
        if (callbackResult && callbackResult.then){
            callbackResult.forwardCompletion(proxyOp);
            return;
        }
        proxyOp.succeed(callbackResult);
      } else {
          proxyOp.succeed(operation.result);
      }

    }

    function errorHandler(){
        if(onError){
            let callbackResult;
            try {
                callbackResult = onError(operation.error);
            } catch (error) {
                proxyOp.fail(error);
                return;
            }
            if (callbackResult && callbackResult.then){
                callbackResult.forwardCompletion(proxyOp);
                return;
            }
            proxyOp.succeed(callbackResult);
        } else {
            proxyOp.fail(operation.error);
        }
    }

    
    if(operation.state == "succeeded"){
        successHandler();
    } else if (operation.state == "failed"){
        errorHandler();
    } else {
        operation.successReactions.push(successHandler);
        operation.errorReactions.push(errorHandler);
    }
   
    return proxyOp;
  };
  operation.then = operation.onCompletion;
    operation.catch = operation.onFailure;

  // Finishes an Op whenever this op is finished
  operation.forwardCompletion = function (op) {
      operation.onCompletion(op.succeed);
      operation.onFailure(op.fail);
  };

  return operation;
}

function doLater(func){
    setTimeout(func, 15);
}

function fetchFailingCity(){
  var operation = new Operation();
  doLater(() => operation.fail(new Error("GPS broken!")));
  return operation;
}

test('thrown error', function(done){
    fetchCurrentCity()
        .then((city) => {
            throw new Error('test');
        })
        .catch(e => done());
});


test('sync transformation', function(done){
   fetchCurrentCity()
       .then((city) => {
           return '1000'
       })
       .then((zip) => {
            console.log(zip);
           expect(zip).toBe('1000');
            done();
    });
});

test("sync error recovery", function(done){
  fetchFailingCity()
      .catch(function(error){
          console.log(error);
          return 'default city';
      })
      .then((city) => {
        expect(city).toBe("default city");
        done();
    })
});

test("async error recovery", function(done){
  fetchFailingCity()
      .catch(function(){
          return fetchCurrentCity();
      })
      .then((city) => {
        expect(city).toBe(expectedCity);
        done();
    })
});

test('bypass error recovery', function (done) {
   fetchCurrentCity()
       .catch((error) => 'default')
       .then((city) => {
           expect(city).toBe(expectedCity);
           done();
       });
});

test("error fall through", function(done){
  fetchCurrentCity()
      .then((city) => {
            console.log(city);
            return fetchForecast();
      })
      .then((forecast) => {
            expect(forecast).toBe(expectedForecast);
            done();
      })
      .catch((error) => done());
});

test("register only error handlers", function(done){
  const operation = fetchCurrentCity();
  operation.onFailure(error => done(error));
  operation.onCompletion(result => done());
});

test("don't fail if no error handlers are passed", done => {
  const operation = fetchWeather();
  operation.onCompletion(result => done(new Error("shouldn't get here")));
  operation.onFailure(error => done());
});

test("Summary", () => {
    fetchCurrentCity().onCompletion((city) => {
      fetchWeather(city).onCompletion((result) => {
        console.log(result);
      })
    })
});
test("register success callback async", function (done) {
    var currentCity = fetchCurrentCity();
    currentCity.onCompletion(city => console.log(city));
    doLater(function(){currentCity.onCompletion((city) => {done();})})
});

// test("register error callback async", function(done){
//     var currentCity = fetchWeather();
//     // currentCity.onFailure(city => console.log(city));
//     doLater(function(){currentCity.onFailure((error) => {done(error);})})
// });

test("lexical parallelism", function(done){
    const city = "NYC";
    const weather = fetchWeather(city);
    const forecast = fetchForecast(city);
    weather.onCompletion((weather) => {
        forecast.onCompletion((forecast) =>{
            console.log(`${city} has ${weather.temp} and ${forecast.fiveDay}`);
            done();
        })
    });
});

test("removing nesting", function(done){
    fetchCurrentCity()
      // .then((city) => fetchWeather(city))
      .then(fetchWeather)
      // So, whenever we have the result directly passed to the
      // next op / callback, we can omit the parameters passed
      // to the callback.
      .then(printWeather);
    function printWeather(weather){
      console.log(`Printing weather ${weather.temp}`);
      done();
    }
});

/* Avoid timing issues with initializing a database
 // initiate operation
 const initDb = initiateDB();

 // register callbacks
 initDb.setCallbacks(function(db){
 db.InsertPayment();
 });

 initDb.setCallbacks(function(db){
 db.InsertUser();
 })
 );*/
