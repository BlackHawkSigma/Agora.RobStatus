const fs = require('fs')
const _ = require('lodash')

const parser = require('./parseMasterData')

module.exports = function robStatus(optins) {

  var masterData = {}

  this.add('role:robStatus, cmd:findMissing', findMissing)
  this.add('init:robStatus', init)

  function init(msg, respond) {
    parser().then(() => {
      // Read latest masterData file
      fs.readFile(optins.fileName, function(err, data) {
        if (err) return respond(err)
        masterData = JSON.parse(data)
        respond()
      })
    })
  }

  function findMissing(msg, respond) {
    // Find all NOK skids
    // Treat every row
    data = msg.csv
    data.pop()
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

    let minTime = _.minBy(data, (o) => o.Zeitpunkt )
    let maxTime = _.maxBy(data, (o) => o.Zeitpunkt )

    // Remove "leerprogramm"
    _.remove(data, {'Programm': 9990})

    // Remove PLA, PDC etc.
    _.remove(data, function(value, index) {
      return _.includes([1221, 1231, 1321, 1331, 1341, 3081, 3334, 9591, 9099, 9243], value.Programm)
    })

    nokData = _.filter(data, {
      'OK': false,
      'aktiv': true
    })

    // Order everything nicely
    list = []
    result = _.groupBy(nokData, 'Kabine')
    _.each(result, function(value, kabine) {
      result[kabine] = _.groupBy(result[kabine], 'Zeitpunkt')
      _.each(result[kabine], function(value, zeitpunkt) {
        robots = _.map(result[kabine][zeitpunkt], 'Roboter')
        list.push({
          'Kabine': result[kabine][zeitpunkt][0].Kabine,
          'Zeitpunkt': result[kabine][zeitpunkt][0].Zeitpunkt,
          'Skid': result[kabine][zeitpunkt][0].Skid,
          'Artikel': result[kabine][zeitpunkt][0].Stammdaten.Artikel,
          'Typcode': result[kabine][zeitpunkt][0].Programm,
          'Farbe': result[kabine][zeitpunkt][0].Stammdaten.Farbe,
          'Roboter': robots
        })
      })
    })

    summary = _.countBy(list, 'Kabine')

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
      'summary': summary,
      'nok': list,
      'missing': missingStammdaten,
      'time': {
        min: minTime.Zeitpunkt,
        max: maxTime.Zeitpunkt
      }
    }
    respond(null, out)
  }
}
