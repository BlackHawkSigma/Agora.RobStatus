const csv = require('csv-parse')
const fs = require('fs')
const _ = require('lodash')
const debug = require('debug')('csv')
var stammdaten = require(__dirname + '/data/stammdaten.json')

const fileName = __dirname + '/data/Pivot.csv'
const resultFileName = __dirname + '/data/result.json'
const debugFileName = __dirname + '/data/debug.json'

fs.readFile(fileName, function(err, data) {
  csv(data, {
    auto_parse: true,
    columns: true,
    delimiter: ';'
  }, function(err, data) {
      _.each(data, function(value, index) {
        var Kabine = ""
        switch (_.toNumber(value.Bereich.slice(2, -3))) {
          case 1:
            Kabine = "FL"
            break;
          case 2:
            Kabine = "PR"
            break;
          case 3:
            Kabine = "BC"
            break;
          case 4:
            Kabine = "CC"
            break;
          default:
            Kabine = "n/a"
        }

      dataset = _.find(stammdaten, {
        'Programm': value.Programm,
        'Farbcode': _.toString(value.Farbcode)
      })
      _.assign(value, {
        'Kabine': Kabine,
        'Roboter': _.toNumber(value.Bereich.slice(4, -1)),
        'Skid': value.Produktionseinheit,
        'Stammdaten': dataset
      })
      _.assign(value, {
        'Vorgabe': _.get(dataset, [value.Kabine], 'n/a'),
        'Wert': Math.pow(2, (value.Roboter - 1))
      })
      _.assign(value, {
        'aktiv': (value.Vorgabe & value.Wert) > 0 ? true : false,
        'OK': value.Status == 1 ? true : false
      })
      data[index] = _.pick(data[index], ['Kabine', 'Roboter', 'Skid', 'Zeitpunkt', 'Stammdaten', 'Programm', 'Farbcode', 'Vorgabe', 'OK', 'aktiv'])
    })

    // Remove "leerprogramm"
    _.remove(data, {'Programm': 9990})

    nokData = _.filter(data, {
      'OK': false,
      'aktiv': true
    })

    // Save result to file
    result = _.groupBy(nokData, 'Kabine')
    _.each(result, function(value, kabine) {
      result[kabine] = _.groupBy(result[kabine], 'Zeitpunkt')
      _.each(result[kabine], function(value, zeitpunkt) {
        result[kabine][zeitpunkt] = _.groupBy(result[kabine][zeitpunkt], 'Skid')
      })
    })
    fs.writeFile(resultFileName, JSON.stringify(result), function(err) {
      if (err) {
        console.error(err)
        throw err
      }
      console.log('done result')
    })

    // Save missing Typ- and Colorcodes
    missingStammdaten = _
      .chain(data)
      .filter({
      'Vorgabe': 'n/a'
      })
      .flatMap(function(value, index) {
        object = {}
        object.Programm = value.Programm
        object.Farbcode = value.Farbcode
        return object
      })
      .uniqWith(_.isEqual)
      .value()
    fs.writeFile(debugFileName, JSON.stringify(missingStammdaten), function(err) {
      if (err) {
        console.error(err)
        throw err
      }
      console.log('done missing')
    })
  })
})
