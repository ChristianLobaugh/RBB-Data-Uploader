
const base =  require('./airtable-provider')
const fancyLog = require('../utils').fancyLog
const listRecords = require('./list')
const chunk = require('lodash.chunk')

const parseData = require('../csv') 
const schema = require('../csv/lib/airtable').schema
const fs = require('fs');

const businessCategoriesJSON = fs.readFileSync(__dirname + '/../business-categories.json');
const businessCategories = JSON.parse(businessCategoriesJSON);

const availableFields = [...Object.keys(schema)]
/*
  Add field names here to omit them from the deduplication routine.
  ======================
  For example, the Source field might be overwritten if a business is
  submitted via the webform _after_ it was uploaded by a scraping routine.
  In that case we wouldn't want to add a new row when the only difference
  is the Source field.
*/
const fieldsToIgnore = ['Source', 'Storefront']
const fieldsToDedupe = availableFields.filter(field => !fieldsToIgnore.includes(field))

const slug = require('slug')
const crypto = require('crypto')
const cloudinary = require('cloudinary').v2
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
})

async function create(tablename, csvFile, csvSource) {
  const csvData = await parseData(csvFile, csvSource)
  listRecords(tablename, tableData => {
    fancyLog(`Deduplicating ${csvData.length} records`)
    const dedupedUploadList = []
    csvData.forEach(csvRow => {
      // Determine if the record already exists in Airtable by checking against a list of safe fields.
      const recordAlreadyExists = tableData.find(tableDataRow => {
        // ensure that every field in the list of fields that qualify for deduplication DO NOT HAVE the same value.  
        return fieldsToDedupe.every(fieldName => {
          // TODO: (bmc) There's got to be a better way to handle this logic, but mah brainz hurt
          if (!csvRow.fields[fieldName] && !tableDataRow[fieldName]) {
            // If neither field has a truthy value, we can bail early and consider them a match.
            return true
          }
          // if both fields have truthy values we need to compare them
          if (csvRow.fields[fieldName] && tableDataRow[fieldName]) {
            return csvRow.fields[fieldName].toString().toUpperCase() === tableDataRow[fieldName].toString().toUpperCase()
          }

          // If you made it here, that means one of your values is falsy and the other is not.
          // Which also means you're not a duplicate
          return false
        })
      })
      if (!recordAlreadyExists) {
        // Pop out any empty values since Airtable may not allow them.
        // example: empty strings don't qualify as numbers
        for (const [key, value] of Object.entries(csvRow.fields)) {
          if (value === '') {
            delete csvRow.fields[key]
          }
        }

        // Handle global defaults, e.g. things that are set regardless of the source data
        csvRow.fields.Approved = false
        csvRow.fields['Physical Location'] = Boolean(csvRow.fields['Zip Code'])
        // Map the category to one of the approved categories
        const originalCategory = csvRow.fields['Original Category']
        if (originalCategory) {
          const normalizedCategory = businessCategories[csvRow.fields['Original Category'].toLowerCase()]
          csvRow.fields.Category = normalizedCategory
        }
        // upload image to Cloudinary and store Cloudinary public_id ref 
        const originalImageURL = csvRow.fields.Image
        if (originalImageURL) {
          // cloudinary upload destination is business-images/{business-name-as-a-slug} 
          const businessSlug = slug(csvRow.fields['Business Name'])
          // create hash of originalImageURL to add to public_id to protect against duplicates
          const imageHash = crypto.createHash('md5').update(originalImageURL).digest('hex');
          const public_id = `business-images/${businessSlug}-${imageHash}`
          csvRow.fields.Image = public_id
          
          // call cloudinary uploader to push image to Cloudinary
          await cloudinary.uploader.upload(originalImageURL, {
                public_id,
                resource_type: "auto",
                tags: "#black-business",
                overwrite: false
              },
              function(error, image) {
                if (error) {console.warn(error)}                
                console.log("Uploaded " + image.public_id + " to Cloudinary")
              }
          )
        }
        // Add the record to the deduped list.
        dedupedUploadList.push(csvRow)
      }
    })
    if (dedupedUploadList.length > 0) {
      fancyLog(`Found ${dedupedUploadList.length} unique records`)
      const chunkedList = chunk(dedupedUploadList, 10)
      chunkedList.forEach(chunk => {
        base(tablename).create(chunk, function(err, records) {
          if (err) {
            console.error(err);
            return;
          }
          fancyLog(`Created ${records.length} new records`)
          records.forEach(function (record) {
            console.log(record.getId());
          });
        });
      })
      fancyLog(`Finished uploading ${dedupedUploadList.length} records`, 'success', true)
    } else {
      fancyLog(`No new records created`, 'warning', true)
    }
  })
}

module.exports = create