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
    errorReactions: []
  };

  operation.nodeCallback = function(error, result){
    if (error) {
      operation.fail(error);
      return;
    }
    operation.succeed(result);

  };
  operation.fail = function fail(error){
    operation.errorReactions.forEach(r => r(error));
  };
  operation.succeed = function succeed(result){
    operation.successReactions.forEach(r => r(result));
  };

  operation.setCallbacks = function setCallbacks(onSuccess, onError) {
    const noop = function() {};
    operation.successReactions.push(onSuccess || noop);
    operation.errorReactions.push(onError || noop);
  };

  operation.onFailure = function onFailure(onError){
    operation.setCallbacks(null, onError);
  };

  operation.onCompletion = function onCompletion(onSuccess){
    operation.setCallbacks(onSuccess);
  };

  return operation;
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
