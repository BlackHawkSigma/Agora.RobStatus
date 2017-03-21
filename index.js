const masterDataFileName = __dirname + '/data/masterData.json'

const seneca = require('seneca')()
  .use('statusPlugin', {
    fileName : masterDataFileName
  })
  .listen({
    host:'localhost'
  })
