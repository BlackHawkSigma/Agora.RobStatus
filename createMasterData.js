const fs = require('fs')
const _ = require('lodash')

const rawData = require(__dirname + '/data/rawMasterData.json')
const masterDataFileName = __dirname + '/data/masterData.json'

data = _
  .chain(rawData)
  .map(function(a) {
    result = {}
    result.Artikel = a[0]
    result.Farbe = a[5]
    result.Farbcode = a[8]
    result.Typcode = a[10]
    // result.Vorgaben = a[4]
    result.FL = parseInt(a[4].slice(31, -9), 2)
    result.PR = parseInt(a[4].slice(22, -18), 2)
    result.BC = parseInt(a[4].slice(9, -27), 2)
    result.CC = parseInt(a[4].slice(2, -36), 2)
    return result
  })
  .groupBy('Typcode')
  .value()

_.forEach(data, function(value, typcode) {
  data[typcode] = _.groupBy(data[typcode], 'Farbcode')
  _.forEach(data[typcode], function(value, farbcode) {
    data[typcode][farbcode] = {
      'Artikel' : _.min(_.map(value, 'Artikel')),
      'Farbe' : _.min(_.map(value, 'Farbe')),
      'FL' : _.max(_.map(value, 'FL')),
      'PR' : _.max(_.map(value, 'PR')),
      'BC' : _.max(_.map(value, 'BC')),
      'CC' : _.max(_.map(value, 'CC'))
    }
  })
})

fs.writeFile(masterDataFileName, JSON.stringify(data), function(err) {
  if (err) {
    console.error(err)
    throw err
  }
  console.log('Masterdata created')
})
// console.log(data)
