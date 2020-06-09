
const {Client, Status} = require("@googlemaps/google-maps-services-js");

const client = new Client({});

'Cami Cakes Cupcakes Jacksonville'

async function fromNameCityState(name, city, state) {
    try {
        response = await client.findPlaceFromText({
            params: {
              input: `${name}, ${city}, ${state}`,
              inputtype: 'textquery',
              key: process.env.GOOGLE_MAPS_API_KEY,
              fields: ['formatted_address', 'name', 'geometry']
            },
            timeout: 1000,
        });
        if (response.data.status == 'OK') {
            return response.data.candidates[0];
        } else {
            return {};
        }
    } catch (error) {
        console.error(error.response.data);
    }
}

async function fromPhoneNumber(phone) {
    try {
        response = await client.findPlaceFromText({
            params: {
              input: formatPhoneNumber(phone),
              inputtype: 'phonenumber',
              key: process.env.GOOGLE_MAPS_API_KEY,
            },
            timeout: 1000,
        });
        
        console.log(response.data);
    } catch (error) {
        console.error(error.response);
    }
}

// #region Helper Functions
function formatPhoneNumber(phone) {
    // TODO: there's certainly a library that does this better
    const exp = /(?<country>(?<=\+)\d+)?(?<area>\d{3}).*(?<first3>\d{3}).*(?<second4>\d{4})$/;
    const phoneParts = phone.match(exp);
    if (phoneParts !== null) {
        let formatted = `${phoneParts.groups.area}${phoneParts.groups.first3}${phoneParts.groups.second4}`;
        let countryCode = phoneParts.groups.country || '1'; // default to US
        return `+${countryCode}${formatted}`;
    } else {
        throw new Error(`Failed to parse phone number: ${phone}. Area code & 7 digit phone required`)
    }
}
// #endregion Helper Functions

module.exports = {
    fromNameCityState: fromNameCityState,
};
