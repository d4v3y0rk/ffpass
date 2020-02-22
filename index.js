const request = require('axios')
const express = require('express')
const app = express()
const vin = process.env.VIN
const fordUsername = process.env.FORD_USERNAME
const fordPassword = process.env.FORD_PASSWORD

var defaultHeaders = new Map()
defaultHeaders.set('Application-Id', "71A3AD0A-CF46-4CCF-B473-FC7FE5BC4592")
defaultHeaders.set('Accept', '*/*')
defaultHeaders.set('Accept-Language', 'en-us')
defaultHeaders.set('User-Agent', 'fordpass-na/353 CFNetwork/1121.2.2 Darwin/19.3.0')
defaultHeaders.set('Accept-Encoding', 'gzip, deflate, br')
defaultHeaders.set('content-type', 'application/json')


const extendTimeoutMiddleware = (req, res, next) => {
    const space = '.'
    let isFinished = false
    let isDataSent = false

    res.once('finish', () => { isFinished = true })
    res.once('end', () => { isFinished = true })
    res.once('close', () => { isFinished = true })

    res.on('data', (data) => {
        if (data !== space) { isDataSent = true }
    })

    const waitAndSend = () => {
        setTimeout(() => {
            if (!isFinished && !isDataSent) {
                if (!res.headersSent) {
                    res.writeHead(202)
                }
                res.write(space)
                waitAndSend()
            }
        }, 15000)
    }

    waitAndSend()
    next()
}

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
            if (output.data.status == 411) {
                reject(`There was an error starting the engine.`)
            }
            resolve(output.data.status)
        } else {
            reject(output.status)
        }
    })
}

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

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

app.use(extendTimeoutMiddleware)

app.get('/', async (req, res, next) => {
    res.send("I am alive!")
})

app.get('/start', async (req, res, next) => {
    try {
        var token = await auth(fordUsername, fordPassword)
        var result = await start(token)
        console.log(result.status)
        while (await engineStatus(token, result.commandId) != 200) {
            console.log(`Waiting for engine start...`)
            await sleep(5000)
        }
        res.write('Engine Started!')
        res.end()
        next()
    } catch (error) {
        res.write('there was an error starting the engine!')
        res.end()
        next(error)
    }
})

app.get('/stop', async (req, res, next) => {
    try {
        var token = await auth(fordUsername, fordPassword)
        var result = await stop(token)
        console.log(result.status)
        while (await engineStatus(token, result.commandId) != 200) {
            console.log(`Waiting for engine stop...`)
            await sleep(5000)
        }
        res.write('Engine Stopped!')
        res.end()
        next()
    } catch (error) {
        res.write('there was an error stopping the engine!')
        res.end()
        next(error)
    }
})

app.get('/lock', async (req, res, next) => {
    try {
        var token = await auth(fordUsername, fordPassword)
        var result = await lock(token)
        console.log(result.status)
        while (await doorStatus(token, result.commandId) != 200) {
            console.log(`Waiting for doors to lock...`)
            await sleep(5000)
        }
        res.write('Doors Locked!')
        res.end()
        next()
    } catch (error) {
        res.write('There was an error while locking the doors!')
        res.end()
        next(error)
    }
})

app.get('/unlock', async (req, res, next) => {
    try {
        var token = await auth(fordUsername, fordPassword)
        var result = await unlock(token)
        console.log(result.status)
        while (await doorStatus(token, result.commandId) != 200) {
            console.log(`Waiting for doors to unlock...`)
            await sleep(5000)
        }
        res.write('Doors Unlocked!')
        res.end()
        next()
    } catch (error) {
        res.write('There was an error while unlocking the doors!')
        res.end()
        next(error)
    }
})

app.listen(process.env.PORT)