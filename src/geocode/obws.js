const fs = require('fs');

const csv = require('csv-parser');
const {createObjectCsvWriter : createCsvWriter} = require('csv-writer');
const getStream = require('get-stream');

const { fromNameCityState, fromPhoneNumber } = require('./fromName');

async function csvFromPhoneThenName(csvIn, csvOut=undefined) {
    try {
        csvIn = csvIn || csvIn.replace(/(?<!\.csv)$/, '.csv') // add .csv if not there
        csvOut = csvOut || csvIn.replace(/\.csv$/, '_geocode.csv'); // default to ${csvIn}_gecode.csv

        const data = await readCsv(csvIn);
        const csvWriter = newCsvWriter(csvOut);
        await iterateOnPhoneThenName(data, csvWriter);
    } catch (error) {
        console.error(`Failed to run geocoding: ${error.message}`);
    }
}

async function csvFromName(csvIn, csvOut=undefined) {
    try {
        csvIn = csvIn || csvIn.replace(/(?<!\.csv)$/, '.csv') // add .csv if not there
        csvOut = csvOut || csvIn.replace(/\.csv$/, '_geocode.csv'); // default to ${csvIn}_gecode.csv

        const data = await readCsv(csvIn);
        const csvWriter = newCsvWriter(csvOut);
        await iterateOnNameCityState(data, csvWriter);
    } catch (error) {
        console.error(`Failed to run geocoding: ${error.message}`);
    }
}

async function csvFromPhone(csvIn, csvOut=undefined) {
    try {
        csvIn = csvIn || csvIn.replace(/(?<!\.csv)$/, '.csv') // add .csv if not there
        csvOut = csvOut || csvIn.replace(/\.csv$/, '_geocode.csv'); // default to ${csvIn}_gecode.csv

        const data = await readCsv(csvIn);
        const csvWriter = newCsvWriter(csvOut);
        await iterateOnPhone(data, csvWriter);
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
            { id: 'geoName', title: 'geoName' },
            { id: 'latitude', title: 'latitude' },
            { id: 'longitude', title: 'longitude' },
            { id: 'formattedAddress', title: 'formattedAddress' },
        ]
    });
}

async function iterateOnNameCityState(data, csvWriter, nameCol='businessName', cityStateCol='cityState') {
    let geo;
    let last = new Date();
    let now = last;
    let rows = [];
    for (row of data) {
        // if we have to wait Xsec per request anyway, may as well write out to disk for each record...
        // TODO: find more rate-friendly data source
        if (row.onlineBased === 'FALSE') {
            geo = await fromNameCityState(row[nameCol], row[cityStateCol]);
            rows = rows.concat(geo.map((g) => buildRow(row, g)));
            now = new Date();
            await delay(Math.max(0, (100 - (now - last))));
            last = now;
        } else {
            rows.push(buildRow(row, {}))
        }

        if (rows.length >= 10) {
            await csvWriter.writeRecords(rows);
            rows = [];
        }
    }
}

async function iterateOnPhone(data, csvWriter, phoneCol='phone') {
    let geo;
    let last = new Date();
    let now = last;
    let rows = [];
    for (row of data) {
        // if we have to wait Xsec per request anyway, may as well write out to disk for each record...
        // TODO: find more rate-friendly data source
        // if (row.onlineBased === 'FALSE') {
        if (row[phoneCol] !== undefined && row[phoneCol] !== '') {
            geo = await fromPhoneNumber(row[phoneCol]);
            console.log(geo);
            rows = rows.concat(geo.map((g) => buildRow(row, g)));
            now = new Date();
            await delay(Math.max(0, (100 - (now - last))));
            last = now;
        } else {
            rows.push(buildRow(row, {}))
        }

        if (rows.length >= 10) {
            await csvWriter.writeRecords(rows);
            rows = [];
        }
    }

    if (rows.length > 0) {
        await csvWriter.writeRecords(rows);
    }
}

async function iterateOnPhoneThenName(data, csvWriter) {
    const phoneCol = 'phone';
    const nameCol = 'businessName';
    const cityStateCol = 'location';
    let geo;
    let last = new Date();
    let now = last;
    let rows = [];
    for (row of data) {
        if (row[phoneCol] !== undefined && row[phoneCol] !== '') {
            geo = await fromPhoneNumber(row[phoneCol]);
            if (geo === undefined || Object.keys(geo[0]).length === 0) {
                console.warn(`Falling back to name/city-state for ${row[nameCol]}`)
                geo = [];
                // TODO: this rabbit hole is getting deep...
                for (location of row[cityStateCol].split(',')) {
                    geo = geo.concat(await fromNameCityState(row[nameCol], location.trim()));
                    now = new Date();
                    await delay(Math.max(0, (100 - (now - last))));
                    last = now;
                }
            }
            console.log(geo);
            rows = rows.concat(geo.map((g) => buildRow(row, g)));
            now = new Date();
            await delay(Math.max(0, (100 - (now - last))));
            last = now;
        } else {
            rows.push(buildRow(row, {}))
        }

        if (rows.length >= 10) {
            await csvWriter.writeRecords(rows);
            rows = [];
        }
    }

    if (rows.length > 0) {
        await csvWriter.writeRecords(rows);
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
        rowOut.geoName = geo.name;
        rowOut.formattedAddress = geo.formatted_address;
    }
    return rowOut;
}
// #endregion Helper Functions

module.exports = {
    csvFromName: csvFromName,
    csvFromPhone: csvFromPhone,
    csvFromPhoneThenName: csvFromPhoneThenName,
}