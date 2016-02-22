const express = require('express')
const request = require('request-promise')
const app = express()

const key = '3CZtMuShxwtbGP1bLL6S8DZZVBb7r6NkK8ltECfr'  // this is a personal key, please apply for one for yourself for free
const url = `https://api.nasa.gov/planetary/apod?api_key=${key}`

const STATUS_CODE = {
  INTERNAL_ERROR: 102
}

app.get('/apod', (req, res) => {
  request(url)
    .then(html => {
      const result = JSON.parse(html)

      if (result) {
        res.send({
          type: 'ImageURL',
          data: [result.url]
        })
      } else {
        res.send({
          type: 'Error',
          data: [{
            code: STATUS_CODE.INTERNAL_ERROR,
            message: 'NASA error'
          }]
        })
      }
    })
    .catch(err => {
      res.send({
        type: 'Error',
        data: [{
          code: STATUS_CODE.INTERNAL_ERROR,
          message: err.toString()
        }]
      })
    })
})

app.listen(3000, () => {
  console.log('app listening on port 3000!')
})
