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
  getWeather(city, operation.nodeCallback);
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

  operation.setCallbacks = function setCallbacks(onSuccess, onError) {
    const noop = function() {};
    operation.successReactions.push(onSuccess || noop);
    operation.errorReactions.push(onError || noop);
  };

  operation.onFailure = function onFailure(onError){
      if(operation.state == "failed"){
          onError(operation.error);
      } else {
          operation.setCallbacks(null, onError);
      }
  };

  operation.onCompletion = function onCompletion(onSuccess){
      if(operation.state == "succeeded"){
          onSuccess(operation.result)
      } else {
          operation.setCallbacks(onSuccess);
      }
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

test("register error callback async", function(done){
    var currentCity = fetchWeather();
    // currentCity.onFailure(city => console.log(city));
    doLater(function(){currentCity.onFailure((error) => {done(error);})})
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
