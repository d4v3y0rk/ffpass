const request = require('axios')
const argv = require('yargs').argv
const NGo = require('node-geocoder')
const vin = process.env.VIN
const fordUsername = process.env.FORD_USERNAME
const fordPassword = process.env.FORD_PASSWORD

// setup default headers for making requests to the ford api
var defaultHeaders = new Map()
defaultHeaders.set('Application-Id', "71A3AD0A-CF46-4CCF-B473-FC7FE5BC4592")
defaultHeaders.set('Accept', '*/*')
defaultHeaders.set('Accept-Language', 'en-us')
defaultHeaders.set('User-Agent', 'fordpass-na/353 CFNetwork/1121.2.2 Darwin/19.3.0')
defaultHeaders.set('Accept-Encoding', 'gzip, deflate, br')
defaultHeaders.set('content-type', 'application/json')

// setup the google maps api for looking up address info from gps coordinates
const googleMapsApiKey = `${process.env.MAPS_API_KEY || null}`
var geoOptions = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: googleMapsApiKey,
}
var geocoder = NGo(geoOptions)

// uses the fordpass username and password to grab an api token for the ford apis
function auth(username, password) {
    return new Promise(async (resolve, reject) => {
        var headersMap = new Map()
        headersMap.set('Content-Type', 'application/x-www-form-urlencoded')
        headersMap.set('User-Agent', 'fordpass-na/353 CFNetwork/1121.2.2 Darwin/19.3.0')
        headersMap.set('Accept', '*/*')
        headersMap.set('Accept-Language', 'en-us')
        headersMap.set('Accept-Encoding', 'gzip, deflate, br')
        var headers = Object.fromEntries(headersMap)

        var options = {
            method: 'POST',
            baseURL: 'https://fcis.ice.ibmcloud.com/',
            url: '/v1.0/endpoint/default/token',
            headers: headers,
            data: `client_id=9fb503e0-715b-47e8-adfd-ad4b7770f73b&grant_type=password&username=${username}&password=${password}`
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
function status(token) {
    return new Promise(async (resolve, reject) => {
        defaultHeaders.set('auth-token', token)
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'GET',
            baseURL: 'https://usapi.cv.ford.com/',
            url: `/api/vehicles/v4/${vin}/status`,
            headers: headers,
            params: {
                "lrdt": "01-01-1970 00:00:00"
            }
        }
        var result = await request(options)
        if (result.status == 200) {
            resolve(result.data)
        } else {
            reject(result.status)
        }
    })
}

// issue a remotestart *start* command to the vehicle
function start(token) {
    return new Promise(async (resolve, reject) => {
        defaultHeaders.set('auth-token', token)
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'PUT',
            baseURL: 'https://usapi.cv.ford.com/',
            url: `api/vehicles/v2/${vin}/engine/start`,
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

// issue a remotestart *stop* command to the vehicle
function stop(token) {
    return new Promise(async (resolve, reject) => {
        defaultHeaders.set('auth-token', token)
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'DELETE',
            baseURL: 'https://usapi.cv.ford.com/',
            url: `api/vehicles/v2/${vin}/engine/start`,
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

// check the status of a remotestart command
function engineStatus(token, commandId) {
    return new Promise(async (resolve, reject) => {
        defaultHeaders.set('auth-token', token)
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'GET',
            baseURL: 'https://usapi.cv.ford.com/',
            url: `api/vehicles/v2/${vin}/engine/start/${commandId}`,
            headers: headers,
        }
        var output = await request(options)
        if (output.status == 200) {
            // if this code is returned from the api the command failed to start the engine for some reason
            if (output.data.status == 411) {
                reject(`There was an error starting the engine.`)
            }
            resolve(output.data.status)
        } else {
            reject(output.status)
        }
    })
}

// issue a door lock command to the vehicle
function lock(token) {
    return new Promise(async (resolve, reject) => {
        defaultHeaders.set('auth-token', token)
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'PUT',
            baseURL: 'https://usapi.cv.ford.com/',
            url: `api/vehicles/v2/${vin}/doors/lock`,
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

// issue a door unlock command to the vehicle
function unlock(token) {
    return new Promise(async (resolve, reject) => {
        defaultHeaders.set('auth-token', token)
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'DELETE',
            baseURL: 'https://usapi.cv.ford.com/',
            url: `api/vehicles/v2/${vin}/doors/lock`,
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

// check the status of a door command
function doorStatus(token, commandId) {
    return new Promise(async (resolve, reject) => {
        defaultHeaders.set('auth-token', token)
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'GET',
            baseURL: 'https://usapi.cv.ford.com/',
            url: `api/vehicles/v2/${vin}/doors/lock/${commandId}`,
            headers: headers,
        }
        var output = await request(options)
        if (output.status == 200) {
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
    if (argv.start) {
        try {
            var token = await auth(fordUsername, fordPassword)
            var result = await start(token)
            console.log(result.status)
            while (await engineStatus(token, result.commandId) != 200) {
                console.log(`Waiting for engine start...`)
                await sleep(5000)
            }
            console.log('Engine Started!')
        } catch (error) {
            console.log('there was an error starting the engine!')
        }
    }

    if (argv.stop) {
        try {
            var token = await auth(fordUsername, fordPassword)
            var result = await stop(token)
            console.log(result.status)
            while (await engineStatus(token, result.commandId) != 200) {
                console.log(`Waiting for engine stop...`)
                await sleep(5000)
            }
            console.log('Engine Stopped!')
        } catch (error) {
            console.log('there was an error stopping the engine!')
        }
    }

    if (argv.lock) {
        try {
            var token = await auth(fordUsername, fordPassword)
            var result = await lock(token)
            console.log(result.status)
            while (await doorStatus(token, result.commandId) != 200) {
                console.log(`Waiting for doors to lock...`)
                await sleep(5000)
            }
            console.log('Doors Locked!')
        } catch (error) {
            console.log('there was an error locking the doors!')
        }
    }
    
    if (argv.unlock) {
        try {
            var token = await auth(fordUsername, fordPassword)
            var result = await unlock(token)
            console.log(result.status)
            while (await doorStatus(token, result.commandId) != 200) {
                console.log(`Waiting for doors to unlock...`)
                await sleep(5000)
            }
            console.log('Doors Unlocked!')
        } catch (error) {
            console.log('There was an error unlocking the doors!')
        }
    }

    if (argv.status) {
        console.log(`Downloading vehicle status data...`)
        try {
            var token = await auth(fordUsername, fordPassword)
            var result = await status(token)
            console.log(result.status)
            console.log(`Engine State: ${result.vehiclestatus.ignitionStatus.value} \t\t(Refreshed: ${result.vehiclestatus.ignitionStatus.timestamp})`)
            console.log(`Odometer Reading: ${Math.round(result.vehiclestatus.odometer.value/1.609344)} miles \t(Refreshed: ${result.vehiclestatus.odometer.timestamp})`)
            console.log(`Battery Status: ${result.vehiclestatus.battery.batteryHealth.value} \t(Refreshed: ${result.vehiclestatus.battery.batteryHealth.timestamp})`)
            console.log(`Oil Life: ${result.vehiclestatus.oil.oilLifeActual}% \t\t\t(Refreshed: ${result.vehiclestatus.oil.timestamp})`)
            console.log(`Time Pressure: ${result.vehiclestatus.tirePressure.value} \t(Refreshed: ${result.vehiclestatus.tirePressure.timestamp})`)
            console.log(`Distance to Empty: ${Math.round(result.vehiclestatus.fuel.distanceToEmpty/1.609344)} miles \t(Refreshed: ${result.vehiclestatus.fuel.timestamp})`)
            // either use the google maps api to lookup the address or don't based on the --locate argument
            if (argv.locate) {
                var location = await geocoder.reverse({lat:result.vehiclestatus.gps.latitude, lon:result.vehiclestatus.gps.longitude})
                console.log()
                console.log(`Vehicle Location: \n${location[0].formattedAddress}`)
            } else {
                console.log()
                console.log(`Vehicle Location: \n${JSON.stringify(result.vehiclestatus.gps)}`)
            }
        } catch (error) {
            console.log(`There was an error getting vehicle status!`)
        }
    }
}
main()