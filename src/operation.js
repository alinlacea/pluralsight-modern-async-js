const delayms = 1;

function getCurrentCity(callback) {
  setTimeout(function () {

    const city = "New York, NY";
    callback(null, city);

  }, delayms)
}

function getWeather(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get weather"));
      return;
    }

    const weather = {
      temp: 50
    };

    callback(null, weather)

  }, delayms)
}

function getForecast(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get forecast"));
      return;
    }

    const fiveDay = {
      fiveDay: [60, 70, 80, 45, 50]
    };

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
      return operation.onCompletion(null, onError);
  };

  operation.onCompletion = function onCompletion(onSuccess, onError){
    const noop = function() {};
    const completionOp = new Operation();
    
    // Wraps the successHandler so we can forward the result
    function successHandler(){
      if(onSuccess){
        const callbackResult = onSuccess(operation.result);
        // If the result is an OP, then sync the ops
        if (callbackResult && callbackResult.onCompletion){
            callbackResult.forwardCompletion(completionOp);
        }
      }
    }
    
    if(operation.state == "succeeded"){
        successHandler();
    } else if (operation.state == "failed"){
        onError(operation.error);
    } else {
        operation.successReactions.push(successHandler);
        operation.errorReactions.push(onError || noop);
    }
   
    return completionOp;
  };
  operation.then = operation.onCompletion;

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
