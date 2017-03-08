const fs = require('fs')
const csv = require('csv-parse')
const _ = require('lodash')

const masterDataFileName = __dirname + '/data/masterData.json'
// const fileName = __dirname + '/data/Pivot.csv'
const fileName = 'C:/Users/Beese/Desktop/Pivot.csv'

function robStatus(optins) {

  var masterData = {}

  this.add('role:robStatus, cmd:findMissing', findMissing)

  this.add('init:robStatus', init)

  function init(msg, respond) {
    // Read latest masterData file
    fs.readFile(optins.fileName, function(err, data) {
      if (err) return respond(err)
      masterData = JSON.parse(data)
      respond()
    })
  }

  function findMissing(msg, respond) {
    // Find all NOK skids
    csv(msg.csv, {
      auto_parse: true,
      columns: true,
      delimiter: ';'
    }, function(err, data) {
      // Treat every row
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

        // Get masterdata
        dataset = _.get(masterData, [_.toString(value.Typcode), _.toString(value.Farbcode)])

        // Do some magic
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

      // Order everything nicely
      result = _.groupBy(nokData, 'Kabine')
      _.each(result, function(value, kabine) {
        result[kabine] = _.groupBy(result[kabine], 'Zeitpunkt')
        _.each(result[kabine], function(value, zeitpunkt) {
          result[kabine][zeitpunkt] = _.groupBy(result[kabine][zeitpunkt], 'Skid')
        })
      })

      // Find missing Type- and Colorcodes
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

      // Compose respond object
      var out = {
        'nok status': result,
        'missing masterdata': missingStammdaten
      }
      respond(null, out)
    })
  }
}

var seneca = require('seneca')()
  .use(robStatus, {
    fileName : masterDataFileName
  })

fs.readFile(fileName, function(err, data) {
  if (err) throw err

  seneca.act({
    role: 'robStatus',
    cmd: 'findMissing',
    csv: data
  }, function(err, result) {
    fs.writeFile(__dirname + '/data/test.json', JSON.stringify(result))
  })
})
