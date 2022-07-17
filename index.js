const {google} = require('googleapis');
const scopes = 'https://www.googleapis.com/auth/analytics.readonly';
const keys = require('./keys.json');
// console.log(keys);
const jwt = new google.auth.JWT(keys.client_email, null, keys.private_key, scopes);
const reporting = google.analyticsreporting('v4');
// const viewId = '62698320';
const viewId = '73862535';


async function getReports(reports) {
  await jwt.authorize();
  const request = {
    'headers': {'Content-Type': 'application/json'},
    'auth': jwt,
    'resource': reports,
  };
  return await reporting.reports.batchGet(request);
};

const basicReport = {
  'reportRequests': [{
    'viewId': viewId,
    'dateRanges': [{'startDate': '2005-01-01', 'endDate': 'today'}],
    'metrics': [{'expression': 'ga:pageviews'}],
    'dimensions': [{'name': 'ga:pagePath'}],
    'dimensionFilterClauses': [
      {
        'filters': [
          {
            'dimensionName': 'ga:pagePath',
            'operator': 'EXACT',
            'expressions': ['/getusermedia/'],
          },
        ],
      },
    ],
  }],
};

getReports(basicReport).
  then((response) => console.dir(response.data.reports[0].data.totals[0].values)).
  catch((error) => console.log('Error getting report:', error));
