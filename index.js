const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const reporting = google.analyticsreporting('v4');
// const viewId = '62698320';
const viewId = '73862535';

const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly';

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const reportRequest = {
  'viewId': viewId,
  'dateRanges': [{'startDate': '2005-01-01', 'endDate': 'today'}],
  'metrics': [{'expression': 'ga:pageviews'}],
  'dimensions': [{'name': 'ga:pagePath'}],
  'dimensionFilterClauses': [
    {
      'filters': [
        {
          'dimensionName': 'ga:pagePath',
          'operator': 'PARTIAL',
        },
      ],
    },
  ],
};

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

  // Check if we have previously stored a to˝n.
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
async function getReports(auth, paths) {
  const reportRequests = [];
  for (const path of paths) {
    const thisReportRequest = structuredClone(reportRequest);
    thisReportRequest.dimensionFilterClauses[0].filters[0].expressions = path;
    reportRequests.push(thisReportRequest);
  }
  const request = {
    'auth': auth,
    'headers': {'Content-Type': 'application/json'},
    'resource': {'reportRequests': reportRequests},
  };
  // console.log('>>> .filters[0]:',
  //   request.resource.reportRequests[0].dimensionFilterClauses[0].filters[0]);
  // console.log('>>> .filters[0]:',
  //   request.resource.reportRequests[1].dimensionFilterClauses[0].filters[0]);
  reporting.reports.batchGet(request).
    then((response) => handleResponse(response)).
    catch((error) => console.log('\nError getting report:', error));
};

const allPaths = [
  'de/docs/privacy-sandbox/status',
  'en/blog/100-web-moments',
  'en/blog/aligning-input-events',
  'zh/blog/new-in-devtools-102',
  'es/blog/new-in-devtools-104',
  'es/blog/new-in-devtools-94',
  'en/docs/web-platform/origin-trials',
  'en/articles/authenticate-secure-payment-confirmation',
  'de/docs/privacy-sandbox/attribution-reporting-introduction',
  'en/blog/abortable-fetch',
];

const BATCH_SIZE = 5;

function start(auth) {
  for (let i = 0; i < allPaths.length; i += BATCH_SIZE) {
    const paths = allPaths.slice(i, i + BATCH_SIZE);
    getReports(auth, paths);
  }
}

function handleResponse(response) {
  for (const report of response.data.reports) {
    console.log(report.data.rows[0].dimensions[0], report.data.totals[0].values[0]);
  }
}
