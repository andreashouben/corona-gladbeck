#!node

const axios = require('axios');
const HtmlNode = require('node-html-parser');
const fs = require('fs');

(async () => {
    const response = await axios.get('https://www.kreis-re.de/dok/geoatlas/FME/CoStat/Diaggeskra-Gladbeck.html');
    const page = response.data;
    const root = HtmlNode.parse(page);
    let script = root.querySelectorAll('script')[1].innerHTML;
    script =
        `
    const document = {
        getElementById: () => ({
          getContext: () => { }
        })
      };
      
      class Chart {
      
      }
    ` + script + 'module.exports = data;'
    fs.writeFileSync('./src/script.js', script)

    const data = require('./script.js')



    const labels = data.labels.reverse()

    const mapToPrevDay = (data) => data.map(
        (val, idx, arr) => idx === 0 ?
            [val, 0] :
            [val, val - arr[idx - 1]])

    const values = {
        confirmedCases: mapToPrevDay(data.datasets[0].data),
        recoveredCases: mapToPrevDay(data.datasets[1].data),
        deaths: mapToPrevDay(data.datasets[2].data),
        currentlyInfected: mapToPrevDay(data.datasets[3].data),
    }




    const objects = {}

    labels.forEach((label, idx) => {
        function value(label, values) {
            const presign = values[1] > 0 ? '+' : ''
            return `${values[0]}(${presign}${values[1]})`.padEnd(5)
        }
        const confirmed = value('Fälle', values.confirmedCases[idx]).padEnd(15)
        const recovered = value('Genesen', values.recoveredCases[idx]).padEnd(15)
        const deaths = value('Verstorben', values.deaths[idx]).padEnd(15)
        const infected = value('Aktuell infiziert', values.currentlyInfected[idx]).padEnd(15)
        const day = (label.split('.')[0]).padStart(2, '0')
        const month = (label.split('.')[1]).padStart(2, '0')
        const dateString = `2020-${month}-${day}`
        const date = new Date(`2020-${month}-${day}`)
        objects[label] = {
            date, dateString, confirmed, recovered, deaths, infected
        }
    })


    const header = `${'Datum'.padEnd(20)}${'Fälle'.padEnd(15)}${'Genesen'.padEnd(15)}${'Verstorben'.padEnd(15)}${'Aktuell infiziert'.padEnd(15)}`
    let lines = []
    lines = [...lines, header]
    Object.values(objects).forEach(value => {
        const datum = `${value.dateString}`.padEnd(20)
        const line = `${datum}${value.confirmed}${value.recovered}${value.deaths}${value.infected}`;
        lines = [...lines, line]

        if (value.date.getDay() === 1) {
            lines = [...lines, '                     ---------- Neue Woche ----------']
            lines = [...lines, header]
        }

    })

    fs.writeFileSync('output.txt', lines.join('\n'))

})();

