# Forget Fordpass

The Fordpass App requires you to put in a pin and tell it you are not driving and takes forever to issue commands to your vehicle. This little nugget of code talks to the APIs and makes starting/stoping the engine and locking/unlocking the doors super easy.

If you find this useful let me know on Twitter. @d4v3y0rk  

## TL:DR

The code requires several environment variables to set set for it to work:
```
export FORD_USERNAME="<your fordpass username>"
export FORD_PASSWORD="<your fordpass password>"
export VIN="<your vehicle VIN number>"
export MAPS_API_KEY="<a google maps api key>" // this is optional
```

Once you have those thing setup you can issue commands and check the status of your vehicle like this:

`node car.js --status`      // returns vehicle status information

`node car.js --status --locate`     // returns vehicle status information with address from google maps

`node car.js --start`       // issues engine start command to the vehicle

`node car.js --stop`        // issues engine stop command to the vehicle

`node car.js --lock`        // issues door lock command to the vehicle

`node car.js --unlock`      // issues door unlock command to the vehicle


## Heroku

Aside from the car.js script you can push this to heroku, set the config variables and run it as an API. If you do this you can setup Siri Shortcuts on your iOS device to enable you to issue commands to your vehicle with your voice using Siri. 

## Purpose

I created this to enable interoperability between my computer and my car. As is allowed by U.S., Section 103(f) of the Digital Millennium Copyright Act.
