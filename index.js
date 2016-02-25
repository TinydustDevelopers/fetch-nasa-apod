'use strict'

const fs = require('fs')
const path = require('path')

const express = require('express')
const request = require('request-promise')
const low = require('lowdb')
const storage = require('lowdb/file-sync')
const moment = require('moment')

const cdnify = require('./upload')

const app = express()
const db = low('db.json', { storage })

const NASA_KEY = '3CZtMuShxwtbGP1bLL6S8DZZVBb7r6NkK8ltECfr'  // this is a personal key, please apply for one for yourself for free at https://api.nasa.gov
const CDN_HOST = 'http://7xpbf9.com2.z0.glb.qiniucdn.com/'  // this is a Chinese cloud storage provider, you should apply for your own too
const IMAGE_STORAGE_PATH = path.join(__dirname, 'images')
const STATUS_CODE = {
  INTERNAL_ERROR: 102
}

// let daysBefore = 0  // 暂时不缓存前一天的图片
let latestImageLocation = ''

const image = db('images').last()
if (image) {
  latestImageLocation = image.url
}

try {
  fs.accessSync(IMAGE_STORAGE_PATH)
} catch (e) {
  fs.mkdirSync(IMAGE_STORAGE_PATH)
}

const fetch = (time) => {
  const formattedTime = time.format('YYYY-MM-DD')
  const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}&date=${formattedTime}`

  console.log('fethcing ' + formattedTime)

  return new Promise((resolve, reject) => {
    request(url)
      .then(html => {
        const result = JSON.parse(html)

        if (result.media_type === 'image') {
          resolve(result.url)
        } else {
          reject(new Error('not image'))
        }
      })
      .catch(err => {
        console.error(err);
        reject(err)
      })
  })
}

const cache = (time) => {
  if (!time) {
    time = moment()
  }

  const picName = `${moment().format('YYYY-MM-DD')}_nasa_apod.jpg`
  const pathToSave = path.join(IMAGE_STORAGE_PATH, picName)

  let qiniuPicName = '';
  if (latestImageLocation) {
    qiniuPicName = latestImageLocation[latestImageLocation.length - 1];
  }

  if (picName !== qiniuPicName) {
    fetch(time)
      .then(url => {
        // daysBefore = 0

        request(url)
          .pipe(fs.createWriteStream(pathToSave))
          .on('finish', () => {
            cdnify(picName, pathToSave)
              .then(reply => {
                console.log('uploaded to qiniu, key: %s, hash: %s, at %s', reply.key, reply.hash, new Date())
                latestImageLocation = CDN_HOST + reply.key

                db('images')
                  .chain()
                  .push({ url: latestImageLocation })
                  .remove(element => {
                    return latestImageLocation !== element.url
                  })
                  .value()

                fs.unlinkSync(path.join(IMAGE_STORAGE_PATH, picName))
              })
              .catch(err => {
                console.error(err)
              })
          })
      })
      .catch(err => {
        console.error(err)

        // daysBefore++
        // cache(moment().subtract(daysBefore, 'days'))
      })
  }
}

app.get('/apod', (req, res) => {
  if (latestImageLocation) {
    res.send({
      type: 'ImageURL',
      data: [latestImageLocation]
    })
  } else {
    res.send({
      type: 'Error',
      data: [{
        code: STATUS_CODE.INTERNAL_ERROR,
        message: '没有获取到 NASA 太空图片'
      }]
    })
  }
})

app.listen(3000, () => {
  console.log('app listening on port 3000')
})

setInterval(() => {
  cache(moment())
}, moment.duration(4, 'hours').as('milliseconds'))

cache(moment())
