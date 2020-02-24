const request = require('axios')
const argv = require('yargs').argv
const NGo = require('node-geocoder')
const qs = require('querystring')
const vin = process.env.VIN
const fordUsername = process.env.FORD_USERNAME
const fordPassword = process.env.FORD_PASSWORD
const googleMapsApiKey = `${process.env.MAPS_API_KEY || null}`

const fordAPIUrl = 'https://usapi.cv.ford.com/'

// setup header objects
var defaultHeaders = new Map()
defaultHeaders.set('Accept', '*/*')
defaultHeaders.set('Accept-Language', 'en-us')
defaultHeaders.set('Content-Type', 'application/json')
defaultHeaders.set('User-Agent', 'fordpass-na/353 CFNetwork/1121.2.2 Darwin/19.3.0')
defaultHeaders.set('Accept-Encoding', 'gzip, deflate, br')

var fordHeaders = new Map()
fordHeaders.set('Application-Id', "71A3AD0A-CF46-4CCF-B473-FC7FE5BC4592")

var iamHeaders = new Map()
iamHeaders.set('Content-Type', 'application/x-www-form-urlencoded')

// setup the google maps api for looking up address info from gps coordinates
var geoOptions = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: googleMapsApiKey,
}
var geocoder = NGo(geoOptions)

// uses the fordpass username and password to grab an api token for the ford apis
function auth(username, password) {
    return new Promise(async (resolve, reject) => {
        // using the spread operator (...) to expand the maps into arrays and merge them into a new map
        // the defaultHeader content-type is replaced in the resultant map because the same key/value pair exists
        var authHeaders = new Map([...defaultHeaders, ...iamHeaders])
        var headers = Object.fromEntries(authHeaders)
        var requestData = new Map()
        requestData.set('client_id', '9fb503e0-715b-47e8-adfd-ad4b7770f73b')
        requestData.set('grant_type', 'password')
        requestData.set('username', username)
        requestData.set('password', password)
        var options = {
            method: 'POST',
            baseURL: 'https://fcis.ice.ibmcloud.com/',
            url: '/v1.0/endpoint/default/token',
            headers: headers,
            data: qs.stringify(Object.fromEntries(requestData))
        }
        var result = await request(options)
        if (result.status == 200) {
            resolve(result.data.access_token)
        } else {
            reject(result.status)
        }
    })
}

// lookup vehicle status data
function vehicleStatus(token) {
    return new Promise(async (resolve, reject) => {
        var apiHeaders = new Map([...defaultHeaders, ...fordHeaders])
        apiHeaders.set('auth-token', token)
        var headers = Object.fromEntries(apiHeaders)
        var options = {
            method: 'GET',
            baseURL: fordAPIUrl,
            url: `/api/vehicles/v4/${vin}/status`,
            headers: headers,
            params: {
                "lrdt": "01-01-1970 00:00:00"
            }
        }
        var result = await request(options)
        if (result.status == 200) {
            resolve(result.data.vehiclestatus)
        } else {
            reject(result.status)
        }
    })
}

function issueCommand(token, command) {
    return new Promise(async (resolve, reject) => {
        var apiHeaders = new Map([...defaultHeaders, ...fordHeaders])
        apiHeaders.set('auth-token', token)
        var headers = Object.fromEntries(apiHeaders)
        var method = ""
        var url = ""
        if (command == 'start') {
            method = 'PUT'
            url = `api/vehicles/v2/${vin}/engine/start`
        } else if (command == 'stop') {
            method = 'DELETE'
            url = `api/vehicles/v2/${vin}/engine/start`
        } else if (command == 'lock') {
            method = 'PUT'
            url = `api/vehicles/v2/${vin}/doors/lock`
        } else if (command == 'unlock') {
            method = 'DELETE'
            url = `api/vehicles/v2/${vin}/doors/lock`
        } else {
            reject('No command specified for issueCommand!')
        }
        var options = {
            method: method,
            baseURL: fordAPIUrl,
            url: url,
            headers: headers,
        }
        var result = await request(options)
        if (result.status == 200) {
            resolve(result.data)
        } else {
            reject(result.status)
        }
    })
}

// check the status of a vehicle command
function commandStatus(token, command, commandId) {
    return new Promise(async (resolve, reject) => {
        var url = ""
        if (command == 'start' || command == 'stop') {
            url = `api/vehicles/v2/${vin}/engine/start/${commandId}`
        } else if (command == 'lock' || command == 'unlock') {
            url = `api/vehicles/v2/${vin}/doors/lock/${commandId}`
        } else {
            reject('no command specified for commandStatus')
        }
        var apiHeaders = new Map([...defaultHeaders, ...fordHeaders])
        apiHeaders.set('auth-token', token)
        var headers = Object.fromEntries(apiHeaders)
        var options = {
            method: 'GET',
            baseURL: fordAPIUrl,
            url: url,
            headers: headers,
        }
        var output = await request(options)
        if (output.status == 200) {
            if (output.data.status == 411) {
                reject(`There was an error executing the ${command} command to the vehicle.`)
            }
            resolve(output.data.status)
        } else {
            reject(output.status)
        }
    })
}

// sleep the script so we don't hit a rate limit on the status api requests
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// main async function so we can use await
async function main() {
    var token = await auth(fordUsername, fordPassword)

    if (argv.command == 'status') {
        console.log(`Downloading vehicle status data...`)
        try {
            var vehicleData = await vehicleStatus(token)
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
                console.log(`Vehicle Location: \n${location[0].formattedAddress}`)
            } else {
                console.log()
                console.log(`Vehicle Location: \n${JSON.stringify(vehicleData.gps)}`)
            }
        } catch (error) {
            console.log(`There was an error getting vehicle status! ${error}`)
        }
    } else {
        try {
            var result = await issueCommand(token, argv.command)
            console.log(result.status)
            while (await commandStatus(token, argv.command, result.commandId) != 200) {
                console.log(`Waiting for command ${argv.command} response...`)
                await sleep(5000)
            }
            console.log(`Command: ${argv.command} executed successfully!`)
        } catch (error) {
            console.log(`There was an error sending the command: ${argv.command} to the vehicle!`)
        }
    }
}
main()
