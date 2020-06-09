const fs = require('fs');

const csv = require('csv-parser');
const {createObjectCsvWriter : createCsvWriter} = require('csv-writer');
const getStream = require('get-stream');

const { fromAddress } = require('./fromAddress');

async function fromAddressCli(csvIn, csvOut=undefined) {
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
            { id: 'name', title: 'name' },
            { id: 'imageUrl', title: 'imageUrl' },
            { id: 'categories', title: 'categories' },
            { id: 'address', title: 'address' },
            { id: 'description', title: 'description' },
            { id: 'link', title: 'link' },
            { id: 'street', title: 'street' },
            { id: 'city', title: 'city' },
            { id: 'state', title: 'state' },
            { id: 'zip', title: 'zip' },
            { id: 'guessedCity', title: 'guessedCity' },
            { id: 'latitude', title: 'latitude' },
            { id: 'longitude', title: 'longitude' },
            { id: 'formattedAddress', title: 'formattedAddress' },
            { id: 'geoCountry', title: 'country' },
            { id: 'geoCity', title: 'city' },
            { id: 'geoState', title: 'state' },
            { id: 'geoZipcode', title: 'zipcode' },
            { id: 'geoStreetName', title: 'streetName' },
            { id: 'geoStreetNumber', title: 'streetNumber' },
            { id: 'geoCountryCode', title: 'countryCode' },
            { id: 'geoProvider', title: 'provider' },
        ]
    });
}

async function iterateGently(data, csvWriter, addressCol='address') {
    let geo;
    let last = new Date();
    let now = last;
    for (row of data) {
        // currently using opensource Nominatim (OpenStreetMaps) API which limits requests to 1 / second
        // if we have to wait 1sec per request anyway, may as well write out to disk for each record...
        // TODO: find more rate-friendly data source
        const rowOut = JSON.parse(JSON.stringify(row));
        geo = await fromAddress(row[addressCol]);
        await csvWriter.writeRecords([buildRow(row, geo)]);

        now = new Date();
        await delay(Math.max(0, (1000 - (now - last))));
        last = now;
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
    return {
        name: row.name,
        imageUrl: row.imageUrl,
        categories: row.categories,
        address: row.address,
        description: row.description,
        link: row.link,
        street: row.street,
        city: row.city,
        state: row.state,
        zip: row.zip,
        guessedCity: row.guessedCity,
        latitude: geo.latitude,
        longitude: geo.longitude,
        formattedAddress: geo.formattedAddress,
        geoCountry: geo.country,
        geoCity: geo.city,
        geoState: geo.state,
        geoZipcode: geo.zipcode,
        geoStreetName: geo.streetName,
        geoStreetNumber: geo.streetNumber,
        geoCountryCode: geo.countryCode,
        geoProvider: geo.provider,
    }
}
// #endregion Helper Functions

module.exports = {
    fromAddressCli: fromAddressCli,
}