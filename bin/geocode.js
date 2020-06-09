#!/usr/bin/env node
require('dotenv').config()

const yargs = require("yargs");

const {fromAddressCli} = require('../src/geocode/ranktribe');
const {fromNameCli} = require('../src/geocode/obws');

const options = yargs
 .usage('Usage: -c path/to/input.csv -o path/to/output.csv')
 .option("c", {alias: "csvin", describe: "the path to the csv file to parse", type: "string", demandOption: true})
 .option("o", {alias: "csvout", describe: "the path to the csv file to write", type: "string", demandOption: false})
 .command('ranktribe', 'geocode csv using address', {}, fromAddress)
 .command('obws', 'geocode csv using name, city and state', {}, fromName)
 .argv;

function fromAddress(options) {
    fromAddressCli(options.csvin, options.csvout);
}

function fromName(options) {
    fromNameCli(options.csvin, options.csvout);
}
