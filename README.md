# Forget Fordpass

The Fordpass App requires you to put in a pin and tell it you are not driving and takes forever to issue commands to your vehicle. This little nugget of code talks to the APIs and makes starting/stoping the engine and locking/unlocking the doors super easy.

If you find this useful let me know on Twitter. @d4v3y0rk  

## TL:DR

UPDATE: I have moved the majority of the backend code to an NPM Module [ffpass](https://www.npmjs.com/package/ffpass)

The code requires several environment variables to set for it to work:
```
export FORD_USERNAME="<your fordpass username>"
export FORD_PASSWORD="<your fordpass password>"
export VIN="<your vehicle VIN number>"
export MAPS_API_KEY="<a geocodio maps api key>" // this is optional
```

Once you have those thing setup you can issue commands and check the status of your vehicle like this:

`node index.js --command=status`      // returns vehicle status information

`node index.js --command=status --locate`     // returns vehicle status information with address from Geocodio

`node index.js --command=start`       // issues engine start command to the vehicle

`node index.js --command=stop`        // issues engine stop command to the vehicle

`node index.js --command=lock`        // issues door lock command to the vehicle

`node index.js --command=unlock`      // issues door unlock command to the vehicle

## Purpose

I created this to enable interoperability between my computer and my car. As is allowed by U.S., Section 103(f) of the Digital Millennium Copyright Act.
