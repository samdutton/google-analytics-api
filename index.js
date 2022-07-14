const {google} = require('googleapis');
const scopes = 'https://www.googleapis.com/auth/analytics.readonly';
const jwt = new google.auth.JWT(process.env.CLIENT_EMAIL, null, process.env.PRIVATE_KEY, scopes);

const viewId = '62698320';

async function getData() {
  await jwt.authorize();
  const result = await google.analytics('v3').data.ga.get({
    'auth': jwt,
    'ids': 'ga:' + viewId,
    'start-date': '30daysAgo',
    'end-date': 'today',
    'metrics': 'ga:pageviews',
  });

  console.log(result);
}

getData();
