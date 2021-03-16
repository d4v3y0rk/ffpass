const argv = require('yargs').argv
const fordApi = require('ffpass')
const NGo = require('node-geocoder')
const code = require('http-status-code')
const geocodeProvider = process.env.GEOCODE_PROVIDER
const geocodeProviderApiKey = process.env.GEOCODE_API_KEY
const car = new fordApi.vehicle(process.env.FORD_USERNAME, process.env.FORD_PASSWORD, process.env.VIN)
 
// setup a geocode api provider to convert from GPS coordinates to an address
// see https://www.npmjs.com/package/node-geocoder#geocoder-providers-in-alphabetical-order for provider options
var geoOptions = {
    provider: geocodeProvider,
    httpAdapter: 'https',
    apiKey: geocodeProviderApiKey,
}
var geocoder = NGo(geoOptions)

// sleep the script so we don't hit a rate limit on the status api requests
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// main async function so we can use await
async function main() {
    await car.auth()

    if (argv.command == 'status') {
        console.log(`Downloading vehicle status data...\n`)
        try {
            var vehicleData = await car.status()
            console.log(`Engine State: ${vehicleData.ignitionStatus.value} \t\t(Refreshed: ${vehicleData.ignitionStatus.timestamp})`)
            console.log(`Odometer Reading: ${Math.round(vehicleData.odometer.value/1.609344)} miles \t(Refreshed: ${vehicleData.odometer.timestamp})`)
            console.log(`Battery Status: ${vehicleData.battery.batteryHealth.value} \t(Refreshed: ${vehicleData.battery.batteryHealth.timestamp})`)
            console.log(`Oil Life: ${vehicleData.oil.oilLifeActual}% \t\t\t(Refreshed: ${vehicleData.oil.timestamp})`)
            console.log(`Tire Pressure: ${vehicleData.tirePressure.value} \t(Refreshed: ${vehicleData.tirePressure.timestamp})`)
            console.log(`Distance to Empty: ${Math.round(vehicleData.fuel.distanceToEmpty/1.609344)} miles \t(Refreshed: ${vehicleData.fuel.timestamp})`)
            // either use the google maps api to lookup the address or don't based on the --locate argument
            if (argv.locate) {
                var location = await geocoder.reverse({lat:vehicleData.gps.latitude, lon:vehicleData.gps.longitude})
                console.log()
                console.log(`Vehicle Location:`)
                console.log(`${location[0].streetNumber} ${location[0].streetName} ${location[0].city}, ${location[0].state} ${location[0].zipcode}`)
            } else {
                console.log()
                console.log(`Vehicle Location: \n${JSON.stringify(vehicleData.gps)}`)
            }
        } catch (error) {
            console.log(`There was an error getting vehicle status! ${error}`)
        }
    } else {
        try {
            var result = await car.issueCommand(argv.command)
            console.log(`Issuing the ${argv.command} command. Result: ${code.getMessage(result.status)}`)
            while (await car.commandStatus(argv.command, result.commandId) == 552) {
                console.log(`Waiting for command response...`)
                await sleep(5000)
            }
            if (await car.commandStatus(argv.command, result.commandId) != 200) {
                console.log(`There was an error executing the command on the vehicle. Code: ${await car.commandStatus(argv.command, result.commandId)}`)
            } else {
                console.log(`Command: ${argv.command} executed successfully!`)
            }
        } catch (error) {
            console.log(`There was an error sending the command: ${argv.command} to the vehicle!`)
        }
    }
}
main()
