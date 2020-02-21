# Forget Fordpass

The Fordpass App requires you to put in a pin and tell it you are not driving and takes forever to issue commands to your vehicle. This little nugget of code talks to the APIs and makes starting/stoping the engine and locking/unlocking the doors super easy. 

## TL:DR

In it's current state this little app won't do much for you. You need to figure out how to get an API key from the app on your phone and the VIN number of your vehicle to use it. You might want to check out mitmproxy in order to figure out how to get those pieces of information. Once you do you can supply them to this ExpressJS app and viola! Now you can do whatever you want with your car and delete that annoying app from your phone. 

## Usage

After you get your key and VIN all you need to do is run this badboy in heroku and issue some commands!
For example:
`curl https://my-awesome-smartcar-app.herokuapp.com/start`
(That will start your car)
