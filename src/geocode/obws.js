const fs = require('fs');

const csv = require('csv-parser');
const {createObjectCsvWriter : createCsvWriter} = require('csv-writer');
const getStream = require('get-stream');

const { fromNameCityState } = require('./fromName');

async function fromNameCli(csvIn, csvOut=undefined) {
    try {
        csvIn = csvIn || csvIn.replace(/(?<!\.csv)$/, '.csv') // add .csv if not there
        csvOut = csvOut || csvIn.replace(/\.csv$/, '_geocode.csv'); // default to ${csvIn}_gecode.csv

        const data = await readCsv(csvIn);
        const csvWriter = newCsvWriter(csvOut);
        await iterateGently(data, csvWriter);
    } catch (error) {
        console.error(`Failed to run geocoding: ${error.message}`);
    }
}

// #region Helper Functions
function newCsvWriter(csvOut) {
    return createCsvWriter({
        path: csvOut,
        header: [
            { id: 'email', title: 'email' },
            { id: 'name', title: 'name' },
            { id: 'businessName', title: 'businessName' },
            { id: 'category', title: 'category' },
            { id: 'zipCode', title: 'zipCode' },
            { id: 'location', title: 'location' },
            { id: 'website', title: 'website' },
            { id: 'image', title: 'image' },
            { id: 'phone', title: 'phone' },
            { id: 'latitude', title: 'latitude' },
            { id: 'longitude', title: 'longitude' },
            { id: 'formattedAddress', title: 'formattedAddress' },
        ]
    });
}

async function iterateGently(data, csvWriter, nameCol='businessName', cityStateCol='cityState') {
    let geo;
    let last = new Date();
    let now = last;
    for (row of data) {
        // if we have to wait Xsec per request anyway, may as well write out to disk for each record...
        // TODO: find more rate-friendly data source
        if (row.onlineBased === 'FALSE') {
            geo = await fromNameCityState(row[nameCol], row[cityStateCol]);
            console.log(geo)
            await csvWriter.writeRecords([buildRow(row, geo)]);
    
            now = new Date();
            await delay(Math.max(0, (100 - (now - last))));
            last = now;
        } else {
            await csvWriter.writeRecords([buildRow(row, {})]);
        }
    }
}

async function readCsv(csvFile) {
    return await getStream.array(fs.createReadStream(csvFile)
        .pipe(csv()));
}

async function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve(), ms);
    });
}

function buildRow(row, geo) {
    rowOut = {
        email: row.email,
        name: row.name,
        businessName: row.businessName,
        category: row.category,
        zipCode: row.zipCode,
        location: row.location,
        businessDescription: row.businessDescription,
        website: row.website,
        image: row.image,
        phone: row.phone,
    };
    if (geo !== undefined) {
        if (geo.geometry !== undefined) {
            rowOut.latitude = geo.geometry.location.lat;
            rowOut.longitude = geo.geometry.location.lng;
        }
        rowOut.formattedAddress = geo.formatted_address;
    }
    return rowOut;
}
// #endregion Helper Functions

module.exports = {
    fromNameCli: fromNameCli,
}