var express      = require('express'),
    app          = express(),
    session      = require('express-session'),
    admin        = require("firebase-admin"),
    bodyParser   = require("body-parser"),
    http         = require('http'),
    satellite    = require('./public/satellite/dist/satellite.js').satellite;

//0Configurations-------------------------------------------------------------->
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/www'));

app.use(session({
    cookieName: 'session',
    secret: "Secret Louis",
    resave: false,
    saveUninitialized: false,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    secure : true
}));

var serviceAccount = require("./private/earth-space-firebase-adminsdk-vvjb3-6435dcdc65.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://earth-space.firebaseio.com"
});

var db = admin.database();

//0Middleware------------------------------------------------------------------>

//0Routes---------------------------------------------------------------------->
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server Started!");
});

var interval;

app.get('/', function(request, response){
  interval = setInterval(addData, 7500);
  response.send('set');
});

app.get('/cancel', function(request, response){
  clearInterval(interval);
  response.send('cancel');
});

function convertSatelliteCoordinates(){
  var currentDate = new Date();
  db.ref('/satellites_updated').once('value').then(function(snapshot){
    if(typeof snapshot.val() === 'undefined' || getDateDifference(snapshot.val(), currentDate) >= 14){
      db.ref('/').update({'satellites_updated' : currentDate}).then(function(snapshot){
        addData();
      }, function(error){
      });
    }
  }, function(error){
  });
}

function addData(){
  db.ref('/satellites').once('value').then(function(snapshot){
      var satellites = snapshot.val();
      for(var key in satellites){
        if(satellites.hasOwnProperty(key)){
          var tleArray = ['',''];
          tleArray[0] = satellites[key]['tle']['0'];
          tleArray[1] = satellites[key]['tle']['1'];
          var satRec = getSatRec(tleArray);
           db.ref('/satellites/' + key + '/').update({'satRec' : satRec}).then(function(snapshot){
          }, function(error){
          });
        }
      }
  }, function(error){
  });
}

function getSatRec(tleArray){
  var lat = '';
  var lng = '';
  var altitude = 0;
    
  // Initialize a satellite record
  var satrec = satellite.twoline2satrec(tleArray[0], tleArray[1]);
  
  //  Or you can use a JavaScript Date
  var positionAndVelocity = satellite.propagate(satrec, new Date());
  
  // The position_velocity result is a key-value pair of ECI coordinates.
  // These are the base results from which all other coordinates are derived.
  var positionEci = positionAndVelocity.position,
      velocityEci = positionAndVelocity.velocity;
  
  var deg2rad = Math.PI/180;
  // Set the Observer at 122.03 West by 36.96 North, in RADIANS
  var observerGd = {
      longitude: -122.0308 * deg2rad,
      latitude: 36.9613422 * deg2rad,
      height: 0.370
  };
  
  //You will need GMST for some of the coordinate transforms.
  //http://en.wikipedia.org/wiki/Sidereal_time#Definition
  var gmst = satellite.gstimeFromDate(new Date());
  
  //You can get ECF, Geodetic, Look Angles, and Doppler Factor.
  var positionEcf   = satellite.eciToEcf(positionEci, gmst),
      positionGd    = satellite.eciToGeodetic(positionEci, gmst);
  
  // Geodetic coords are accessed via `longitude`, `latitude`, `height`.
  var longitude = positionGd.longitude,
    latitude  = positionGd.latitude,
    height    = positionGd.height;
  
  //  Convert the RADIANS to DEGREES for pretty printing (appends "N", "S", "E", "W", etc).
  var longitudeStr = satellite.degreesLong(longitude),
    latitudeStr  = satellite.degreesLat(latitude);
     
  return {latitude : latitudeStr, longitude : longitudeStr, altitude : height};
}

function getDateDifference(satellite_updated, currentDate){
  satellite_updated = new Date(satellite_updated);
  var diff = Math.floor((currentDate - satellite_updated)/86400000);
  return diff;
}

function getDirection(heading){
  var firstChar = heading[0];
  switch(firstChar){
    case 'N' :
      return 'N';
    case 'E' :
      return 'E';
    case 'S' :
      return 'S';
    case 'W' :
      return 'W';
    default :
      return 'N';
  }
}

function deleteObjs(){
  // db.ref('/land_vehicles').once('value').then(function(snapshot){
  //     var satellites = snapshot.val();
  //     var counter = 0;
  //     for(var key in satellites){
  //       if(satellites.hasOwnProperty(key)){
  //         counter++;
  //         if(counter >= 100){
  //           db.ref('/land_vehicles/' + key).set({}).then(function(snapshot){
  //             console.log('yuh');
  //           }, function(error){
  //           });
  //         }
  //       }
  //     }
  // }, function(error){
  // });
}