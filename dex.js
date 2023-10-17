'use strict';

const smartcar = require('smartcar');
const express = require('express');
const session = require('express-session');
const https = require('https');
const axios = require('axios');

const app = express();
app.use(
    session({
      secret: 'zAJ_gK*3MF}-5P4jthv]D9;A(3m9@2h4', // Replace with a strong secret key
      resave: false,
      saveUninitialized: true,
    })
  );
const port = 3000;

const client = new smartcar.AuthClient({
  clientId: '91d33940-bed0-4db3-93f3-4e31b5c26760', // fallback to SMARTCAR_CLIENT_ID ENV variable
  clientSecret: '866e3d10-60ce-4373-aba3-b2888639d498', // fallback to SMARTCAR_CLIENT_SECRET ENV variable
  redirectUri: 'http://localhost:3000/exchange', // fallback to SMARTCAR_REDIRECT_URI ENV variable
  mode: 'test', // launch Smartcar Connect in test mode
});

app.get('/login', function(req, res) {
  const link = client.getAuthUrl(['read_battery','read_charge','read_charge_locations','read_climate','read_compass','read_engine_oil','read_extended_vehicle_info','read_fuel','read_location','read_odometer','read_speedometer','read_thermometer','read_tires','read_vehicle_info','read_vin']);      
  res.redirect(link);
});
let access;

app.get('/exchange', async function(req, res) {
    access = await client.exchangeCode(req.query.code);
    req.session.accessToken = access.accessToken;
    res.redirect('/vehicle');
});

let data = {}

app.get('/vehicle', async function(req, res) {

    const { vehicles } = await smartcar.getVehicles(req.session.accessToken);

    const v1 = new smartcar.Vehicle(vehicles[0],req.session.accessToken)
    
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
      const url = `https://connect.smartcar.com/oauth/reauthenticate?response_type=vehicle_id&client_id=91d33940-bed0-4db3-93f3-4e31b5c26760&vehicle_id=${vehicles[0]}&redirect_uri=http://localhost:3000/exchange&state=0facda3319`; // Replace with the URL you want to connect to
      
      axios.get(url)
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.error(`Error: ${error.message}`);
      });
      
    }
    // console.log(`https://connect.smartcar.com/oauth/reauthenticate?response_type=vehicle_id&client_id=91d33940-bed0-4db3-93f3-4e31b5c26760&vehicle_id=${vehicles[0]}&redirect_uri=http://localhost:3000/exchange&state=0facda3319`)
    res.redirect('/');

})

app.set('view engine', 'ejs'); // Set the view engine to EJS
app.use(express.static('public')); // Serve static files from the "public" directory

app.get('/', (req, res) => {
    if(data){
  res.render('ind', { data });}
    else{
        res.redirect(/login)
    }// Render the "index.ejs" template with data
});

app.use(express.static(__dirname + '/public'));
app.get('/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(__dirname + '/public/style.css');
});

app.listen(port, () => console.log(`Listening on port ${port}`));
