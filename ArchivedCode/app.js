function getLandVehicles(){
  http.get("http://data.cincinnati-oh.gov/resource/w2ka-rfbi.json", function(res){
    var body = '';
    res.on('data', function(chunk){
        body += chunk;
    });
    res.on('end', function(){
        var resp = JSON.parse(body);
        // console.log("Got a response: ", resp);
        var counter = 0;
        for(var key in resp){
          if(resp.hasOwnProperty(key)){
            counter++;
            if(counter % 3 != 0) continue;
            // else if (counter >= 500) break;
            var obj = resp[key];
            var direction = getDirection(obj['heading']);
            var data = {
              direction : direction,
              latitude : obj['latitude'],
              longitude : obj['longitude']
            }
            db.ref('/land_vehicles/').update({[key] : data}).then(function(snapshot){
            }, function(error){
            });
          }
        }
    });
  }).on('error', function(e){
        console.log("Got an error: ", e);
  });
}