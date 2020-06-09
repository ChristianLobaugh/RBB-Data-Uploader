const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({
    provider: 'openstreetmap',
    formatter: null // 'gpx', 'string', ...
});

async function fromAddress(address) {
    try {
        const geo = await geocoder.geocode(address);
        if (geo.length > 0) {
            if (geo.length > 1) {
                console.warn(`WARN: Multiple addresses returned for ${row.name}`);
            }
            return geo[0];
        } else {
            return {};
        }
    } catch (error) {
        console.error(`Failed to fetch geocode for address ${address} with error: ${error.message}`);
        return {};
    }
}

module.exports = {
    fromAddress: fromAddress,
};
