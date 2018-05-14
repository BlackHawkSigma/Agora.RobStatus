const fs = require('fs')
const d3 = require('d3')

const masterDataFileName = __dirname + '/data/masterData.json'

module.exports = () => {
  return new Promise((resole, reject) => {
    fs.readFile(`${__dirname}/data/rawMasterdata.csv`, 'utf-8', (err, data) => {
      if (err) reject(err)

      const rawData = d3.tsvParseRows(data)

      const dataCollection = rawData.map(row => {
        return {
          artikel : row[0],
          farbe : row[5],
          farbcode : row[8],
          typcode : row[10],
          FL : parseInt(row[4].slice(31, -9), 2),
          PR : parseInt(row[4].slice(22, -18), 2),
          BC : parseInt(row[4].slice(9, -27), 2),
          CC : parseInt(row[4].slice(2, -36), 2)
        }
      })

      const nestedData = d3.nest()
        .key(d => d.typcode)
        .key(d => d.farbcode)
        .rollup(v => {
          return {
            Artikel : d3.min(v, d => d.artikel),
            Farbe : d3.min(v, d => d.farbe),
            FL : d3.max(v, d => d.FL),
            PR : d3.max(v, d => d.PR),
            BC : d3.max(v, d => d.BC),
            CC : d3.max(v, d => d.CC)
          }
        })
        .object(dataCollection)

        fs.writeFile(masterDataFileName, JSON.stringify(nestedData, undefined, 2), err => {
          if (err) reject(err)

          console.log('Masterdata created')
          resole()
        })
    })
  })
}
