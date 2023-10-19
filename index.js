'use strict';

const smartcar = require('smartcar');
const express = require('express');
const path = require('path');
const session = require('express-session');


const app = express();

const port = 3000;

const client = new smartcar.AuthClient({
  clientId: '91d33940-bed0-4db3-93f3-4e31b5c26760', // fallback to SMARTCAR_CLIENT_ID ENV variable
  clientSecret: '79e7ee6f-4e43-4ba5-9b00-22768d8cd6ca', // fallback to SMARTCAR_CLIENT_SECRET ENV variable
  redirectUri: 'https://dashing-camel.vercel.app/exchange', // fallback to SMARTCAR_REDIRECT_URI ENV variable
  mode: 'test', // launch Smartcar Connect in test mode
});
  
app.get('/login',async function(req, res) {
  if(typeof req.session!== 'undefined'){
    const filter = { userId: req.session.userId }
    const connections =  await smartcar.getConnections('{amt}', filter)
  }
  const link = client.getAuthUrl(['read_battery','read_charge','read_charge_locations','read_climate','read_compass','read_engine_oil','read_extended_vehicle_info','read_fuel','read_location','read_odometer','read_speedometer','read_thermometer','read_tires','read_vehicle_info','read_vin']);      
  res.redirect(link);
});
let access;

app.get('/exchange', async function(req, res) {
    access = await client.exchangeCode(req.query.code);
    res.redirect('/vehicle');
});

let data = {}
let user_id = ''
app.get('/vehicle', async function(req, res) {

    const { vehicles } = await smartcar.getVehicles(access.accessToken);
    req.session.accessToken = access.accessToken;
    user_id = await smartcar.getUser(access.accessToken);
    req.session.userId = user_id;
    const v1 = new smartcar.Vehicle(vehicles[0],access.accessToken);
    
    // 
    try{
      // console.log(await v1.lockStatus());
      data = {
        fuel :  await v1.fuel(),
        location :  await v1.location(),
        odometer :  await v1.odometer(),
        attributes : await v1.attributes(),
        vin : await v1.vin(),
      };
    }catch{
      const url = `https://connect.smartcar.com/oauth/reauthenticate?response_type=vehicle_id&client_id=91d33940-bed0-4db3-93f3-4e31b5c26760&vehicle_id=${vehicles[0]}&redirect_uri=https://dashing-camel.vercel.app:3000/exchange&state=0facda3319`; // Replace with the URL you want to connect to
      
      axios.get(url)
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.error(`Error: ${error.message}`);
      });
      
    }
    res.redirect('/');

})

app.set('view engine', 'ejs'); // Set the view engine to EJS
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public')); // Serve static files from the "public" directory

app.get('/', (req, res) => {
    if(Object.keys(data).length !== 0){
  res.render('preview.ejs', { data });
    }
    else{
        res.redirect('/login');
    }// Render the "index.ejs" template with data
});


app.use(express.static(__dirname + '/public'));
app.get('/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(__dirname + '/public/style.css');
});

app.listen(port, () => console.log(`Listening on port ${port}`));


