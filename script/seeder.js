//Things to calculate later
//HF Model year 1/3/5
//13f portfolio value

//hedgefund model
//object.filings[0].companyName = name

//13f
//date of filing object.filings[0].filedAt = date of filing
//year object.filings[0]periodOfReport.slice(0,4) wrap in Number/parsedInt()
//quarter march june sept dec/ object.filings[0]periodOfReport.slice(5,7) conditionals to check number and get quarter

//portfolio value:

// Month      getMonth()  quarter
// --------- ----------  -------
//   January         0         1
// February        1         1
// March           2         1
// April           3         2
// May             4         2
// June            5         2
// July            6         3
// August          7         3
// September       8         3
// October         9         4
// November       10         4
// December       11         4

//stocks
//ticker cant bull from 13f
//qtyOfSharesHeld
//price
//percentage of portfolio

const axios = require('axios')

const {HedgeFund, ThirteenF, Stock} = require('../server/db/models')

// Fiddle with these constants to change the query
const API_KEY = apiKey

const HEDGEFUND = 'BILL & MELINDA'

const SIZE = '5'

// Don't fiddle with this query
const QUERY = {
  query: {
    query_string: {
      query: `formType:\\"13F\\" AND companyName:\\"${HEDGEFUND}\\"`
    }
  },
  from: '0',
  size: `${SIZE}`,
  sort: [
    {
      filedAt: {
        order: 'desc'
      }
    }
  ]
}

async function getInitialData(apiKey, query) {
  try {
    // const {data} = await axios.post(
    //   `https://api.sec-api.io?token=${apiKey}`,
    //   query
    //)
    //console.log(data)
    const data = require('./exampleReturn')
    return data
  } catch (err) {
    console.log('error in getInitialData func—————', err)
  }
}

async function findOrCreateHedgefund(data) {
  try {
    const companyName = data.filings[0].companyName

    const hedgeFund = await HedgeFund.findOrCreate({
      where: {
        name: companyName
      }
    })
    return hedgeFund[0]
  } catch (err) {
    console.log('error in findOrCreateHedgefund func—————', err)
  }
}

async function findOrCreate13F(data, hedgeFund) {
  const thirteenFs = data.filings

  const returnedThirteenFs = await Promise.all(
    thirteenFs.map(async elem => {
      const thirteenF = await ThirteenF.findOrCreate({
        where: {
          hedgeFundId: hedgeFund.id,
          dateOfFiling: elem.filedAt
        }
      })

      return thirteenF[0]
    })
  )

  return returnedThirteenFs
}

async function findOrCreateStock(data, returnedThirteenFs, hedgefund) {
  // const holdingsArray = [13F (instance), 13F, 13F, 13F, 13F]

  // const holdingsArray = [[stock, stock, stock, etc.], [stock, stock, stock, etc.], [stock, etc.]]

  const jsonThirteenFs = data.filings

  const holdingsArrays = await Promise.all(
    jsonThirteenFs.map(async elem => {
      const stockArray = await Promise.all(
        elem.map(async aStock => {
          const stock = await Stock.create({
            cusip: aStock.cusip,
            totalValue: aStock.value,
            qtyOfSharesHeld: aStock.shrsOrPrnAmt.sshPrnamt
          })

          return stock
        })
      )

      return stockArray
    })
  )

  return holdingsArrays
}

async function seedData(apiKey, query) {
  const data = await getInitialData(apiKey, query)

  const hedgeFund = await findOrCreateHedgefund(data)
  const thirteenFs = await findOrCreate13F(data, hedgeFund)

  const stocks = await Promise.all(
    thirteenFs.map(thirteenF => {
      const stock = findOrCreateStock(data, thirteenF, hedgeFund)
    })
  )
}

seedData(API_KEY, QUERY)
