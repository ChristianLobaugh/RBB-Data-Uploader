#!/usr/bin/env node

const yargs = require("yargs");

const {fromAddressCli} = require('../src/geocode/index');
const {fromNameCli} = require('../src/geocode/obws');

const options = yargs
 .usage('Usage: -c path/to/input.csv -o path/to/output.csv')
 .option("c", {alias: "csvin", describe: "the path to the csv file to parse", type: "string", demandOption: true})
 .option("o", {alias: "csvout", describe: "the path to the csv file to write", type: "string", demandOption: false})
 .command('fromAddress', 'geocode csv using address', {}, fromAddress)
 .command('fromName', 'geocode csv using name, city and state', {}, fromName)
 .argv;

function fromAddress(options) {
    fromAddressCli(options.csvin, options.csvout);
}

function fromName(options) {
    fromNameCli(options.csvin, options.csvout);
}
