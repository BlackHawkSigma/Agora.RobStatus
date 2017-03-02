const csv = require('csv-parse')
const fs = require('fs')
const _ = require('lodash')
const debug = require('debug')('csv')



const file = __dirname + '/data/Pivot.csv'

fs.readFile(file, function(err, data) {
  csv(data, {
    auto_parse: true,
    columns: true,
    delimiter: ';'
  }, function(err, data) {
      _.each(data, function(value, index) {
        _.assign(value, {
          'Kabine': _.toNumber(value.Bereich.slice(2, -3)),
          'Roboter': _.toNumber(value.Bereich.slice(4, -1)),
          'Skid': value.Produktionseinheit
        })
        _.assign(value, {
          'Ergebnis': value.Status * Math.pow(2, (value.Roboter - 1))
        })
        // value = _.pick(data, ['Kabine', 'Roboter', 'Skid', 'Zeitpunkt', 'Farbcode', 'Ergebnis', 'Programm'])
      })
      console.log(data)
  })
})
