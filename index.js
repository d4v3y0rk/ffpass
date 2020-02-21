const request = require('axios')
const express = require('express')
const app = express()
const vin = process.env.VIN
const apiToken = process.env.API_KEY
const appId = process.env.APP_ID

var defaultHeaders = new Map()
defaultHeaders.set('Application-Id', appId)
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

function auth() {
    return new Promise(async (resolve, reject) => {
        var headers = Object.fromEntries(defaultHeaders)
        var options = {
            method: 'PUT',
            baseURL: 'https://services.cx.ford.com/',
            url: 'api/oauth2/v1/refresh',
            headers: headers,
            data: {
                "refresh_token": apiToken
            }
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
        //get auth token and make sure it is refreshed
        var token = await auth()
        //start car
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
        //get auth token and make sure it is refreshed
        var token = await auth()
        //stop car
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
        //get auth token and make sure it is refreshed
        var token = await auth()
        //stop car
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
        //get auth token and make sure it is refreshed
        var token = await auth()
        //stop car
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