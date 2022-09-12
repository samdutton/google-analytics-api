const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const reporting = google.analyticsreporting('v4');

const publications = require('./data/publications.json');
// const publicationsDataWithoutAuthors = require('./data/publications-without-authors.json');

const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly';

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Tasks API.
  authorize(JSON.parse(content), start);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  /* eslint-disable camelcase */
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  /* eslint-enable */

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Print the display name if available for 10 connections.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getReports(auth, publicationsBatch) {
  const reportRequests = [];
  for (const publication of publicationsBatch) {
    const reportRequest = {
      'viewId': publication.viewId,
      'dateRanges': [{'startDate': '2005-01-01', 'endDate': 'today'}],
      'metrics': [{'expression': 'ga:pageviews'},
        {'expression': 'ga:uniquePageviews'},
        {'expression': 'ga:avgTimeOnPage'},
        {'expression': 'ga:entrances'},
        {'expression': 'ga:bounceRate'},
        {'expression': 'ga:exitRate'}],
      'dimensions': [{'name': 'ga:pagePath'}],
      'dimensionFilterClauses': [
        {
          'filters': [
            {
              'dimensionName': 'ga:pagePath',
              'operator': 'PARTIAL',
              'expressions': publication.path,
            },
          ],
        },
      ],
    };
    // console.log(reportRequest.dimensionFilterClauses[0].filters[0]);
    reportRequests.push(reportRequest);
  }

//  console.log('>>> reportRequests:', reportRequests);

  const request = {
    'auth': auth,
    'headers': {'Content-Type': 'application/json'},
    'resource': {'reportRequests': reportRequests},
  };
  reporting.reports.batchGet(request).
    then((response) => handleResponse(response)).
    catch((error) => console.log('\nError getting report:', error));
}

const BATCH_SIZE = 5; // Max number of requests for batchGet().

function start(auth) {
  for (let i = 0; i < 10; i += BATCH_SIZE) {
    const publicationsBatch = publications.slice(i, i + BATCH_SIZE);
    // console.log('>>>> publicationsBatch', publicationsBatch);
    getReports(auth, publicationsBatch);
  }
}

function handleResponse(response) {
  try {
    for (const report of response.data.reports) {
      if (report.data.rows) {
        console.log('\nPath:', report.data.rows[0].dimensions[0]);
        console.log('Metrics:', report.data.rows[0].metrics);
      } else {
        console.log('\nNo rows. Report:', report, 'Totals;', report.data.totals[0], '\n');
      }
      // console.log(report.data.rows[0].dimensions[0], report.data.totals[0].values[0]);
    }
  } catch (error) {
    // const reports = response.data.reports;
    console.error('>>> Error getting report:', error);
    // console.log(response.data.reports);
    // for (const report of reports) {
    //   console.log(report.data.rows[0], report.data.totals[0]);
    // }
  }
}

// Convert decimal time to hh:mm:ss
// e.g. convert 123.3 to 2:03
// function toHoursMinutesSeconds(decimalSeconds) {
//   const hours = Math.floor(decimalSeconds/3600);
//   const mins = Math.floor((decimalSeconds - hours * 3600)/60);
//   const secs = Math.floor(decimalSeconds % 60);
//   if (secs < 10) {
//     secs = '0' + secs;
//   };
//   return hours + '' + mins + ':' + secs;
// }
