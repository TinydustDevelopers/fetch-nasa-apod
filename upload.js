var qiniu = require('node-qiniu')

if (process.env.NODE_ENV === 'production') {
  qiniu.config({
    access_key: process.env.QINIU_AK,
    secret_key: process.env.QINIU_SK
  })
} else {
  var config = require('./config')

  qiniu.config({
    access_key: config.AK,
    secret_key: config.SK
  })
}

var imagesBucket = qiniu.bucket('himawari8')

module.exports = function (key, path) {
  return new Promise((resolve, reject) => {
    imagesBucket.putFile(key, path)
      .then(reply => {
        resolve(reply)
      })
      .catch(err => {
        reject(err)
      })
  })
}
