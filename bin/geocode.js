#!/usr/bin/env node
require('dotenv').config()

const yargs = require("yargs");

const ranktribe = require('../src/geocode/ranktribe');
const obws = require('../src/geocode/obws');

const options = yargs
 .usage('Usage: -c path/to/input.csv -o path/to/output.csv')
 .option("c", {alias: "csvin", describe: "the path to the csv file to parse", type: "string", demandOption: true})
 .option("o", {alias: "csvout", describe: "the path to the csv file to write", type: "string", demandOption: false})
 .command('ranktribe', 'geocode csv using address', {}, fromAddress)
 .command('obws', 'geocode csv using name, city and state', {}, fromName)
 .command('csv2csv', 'geocode existing csv', {}, csv2csv)
 .argv;

function fromAddress(options) {
    ranktribe.csvFromAddress(options.csvin, options.csvout);
}

function fromName(options) {
    // obws.csvFromName(options.csvin, options.csvout);
    obws.csvFromPhoneThenName(options.csvin, options.csvout);
}

function csv2csv(options) {
    switch (options.dataset) {
        case ranktribe:
            ranktribe.csvFromAddress(options.csvin, options.csvout);
        case obws:
            // obws.csvFromName(options.csvin, option.csvout);
            obws.csvFromPhone(options.csvin, option.csvout);
    }
}
