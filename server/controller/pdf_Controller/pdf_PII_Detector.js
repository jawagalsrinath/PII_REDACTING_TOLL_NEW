const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const HF_API_KEY = process.env.HF_API_KEY;
async function detectPII(text){
    try {
        console.log('received text for detection : ', text);
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/obi/deid_roberta_i2b2',
            {
                inputs: text.trim(), 
            },
            {
                headers : {
                    'Authorization' : `Bearer ${HF_API_KEY}`,
                    'Content-Type' : 'application/json'
                },
                timeout : 30000
            }
        );

        const piiData = response.data;
        const pii = formatPIIData(piiData);
        return pii;
    }
    catch(error){
        throw new Error(`Error in detecting PII from model : ${error?.response?.data?.error || error.message} `);
    }
}


function formatPIIData(piiData) {
    const piiEntries = [];
    let currentEntity = null;

    for (let i = 0; i < piiData.length; i++) {
        const item = piiData[i];
        let { start, end } = item;
        let value = item.word;
        let type = item.entity_group.toLowerCase();

        // Clean the value (remove newlines, trim whitespace)
        value = value.replace(/\n/g, '').trim();
        if (!value || value === ',') {
            console.log(`Skipping invalid entry: ${JSON.stringify(item)}`);
            continue; // Skip completely invalid entries (e.g., newlines, commas)
        }

        // Map entity types
        const mappedType = type === 'patient' ? 'name' :
                          type === 'org' ? 'organization' :
                          type === 'loc' ? 'location' :
                          type === 'id' ? 'id' :
                          type;

        // Handle speculative types
        if (mappedType === 'hosp') type = 'organization';
        if (mappedType === 'staff') { // removed ID from this line (debug)
            console.log(`Skipping invalid type: ${mappedType}, entry: ${JSON.stringify(item)}`);
            continue; // Skip invalid types
        }
        if (mappedType === 'phone') type = 'phone number';
        if (mappedType === 'date') type = 'date';

        // Relax length filter for names (allow single characters for initials)
        if (mappedType !== 'name' && value.length < 2) {
            console.log(`Skipping short non-name entry: ${JSON.stringify(item)}`);
            continue; // Skip short values for non-name types
        }

        // Aggregate entities if they are of compatible types and close in proximity
        const proximityThreshold = 2; // Allow small gaps (e.g., for spaces or punctuation)
        const canAggregate = (currentEntity) => {
            if (!currentEntity) return false;
            // Allow aggregation for same types
            if (currentEntity.type === mappedType) return true;
            // Allow aggregation between location and organization (e.g., for addresses)
            if (
                (currentEntity.type === 'location' && mappedType === 'organization') ||
                (currentEntity.type === 'organization' && mappedType === 'location')
            ) return true;
            return false;
        };

        if (canAggregate(currentEntity) && start - currentEntity.end <= proximityThreshold) {
            console.log(`Aggregating: ${currentEntity.value} + ${value}`);
            currentEntity.value += ' ' + value;
            currentEntity.end = end;
            // Update type if aggregating location and organization (prefer location for addresses)
            if (currentEntity.type === 'organization' && mappedType === 'location') {
                currentEntity.type = 'location';
            }
        } else {
            if (currentEntity) {
                piiEntries.push(currentEntity);
                console.log(`Pushed entity: ${JSON.stringify(currentEntity)}`);
            }
            currentEntity = { type: mappedType, value, start, end };
        }
    }

    // Push the last entity if it exists
    if (currentEntity) {
        piiEntries.push(currentEntity);
        console.log(`Pushed final entity: ${JSON.stringify(currentEntity)}`);
    }

    console.log('Formatted PII:', JSON.stringify(piiEntries, null, 2));
    return piiEntries;
}
module.exports = { detectPII };
//'https://api-inference.huggingface.co/models/naver-clova-ix/donut-base'