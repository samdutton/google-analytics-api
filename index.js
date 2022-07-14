const {google} = require('googleapis');

const publicationsData = require('./data/publications.json');
const publicationsDataWithoutAuthors = require('./data/publications-without-authors.json');

const numPublications = publicationsDataWithoutAuthors.length + publicationsData.length;
const SPREADSHEET_ID = '1PUiirLMSiO2fJonbkVcrpzfpMXhH8vVlo5s6MxnL6u4';
const RANGE = `Publications!2:${numPublications + 1}`;
//  const HEADER_ROW = [['Title', 'Authors', 'Date', 'Updated', 'URL']];

async function authorise() {
  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      keyFile: 'keys.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
  } catch (error) {
    console.error('>>> Auth error:', error);
  }
  try {
    const authClientObject = await auth.getClient();
    const googleSheetsInstance = google.sheets({version: 'v4', auth: authClientObject});
    const publicationsWithAuthors = publicationsData.map((publication) =>
      [publication.title, publication.authors, publication.date, publication.updated,
        createHyperlink(publication.url), createHyperlink(publication.github)]);
    // appendToSheet(googleSheetsInstance, auth, HEADER_ROW);
    const publicationsWithoutAuthors = publicationsDataWithoutAuthors.map((publication) =>
      [publication.title, publication.authors, publication.date, publication.updated,
        createHyperlink(publication.url), createHyperlink(publication.github)]);
    // console.log(publicationsWithoutAuthors);
    await clearSheet(googleSheetsInstance, auth);
    await updateSheet(googleSheetsInstance, auth, publicationsWithAuthors);
    appendToSheet(googleSheetsInstance, auth, publicationsWithoutAuthors);
  } catch (error) {
    console.error('>>> Error adding data to sheet:', error);
  }
}

function createHyperlink(url) {
  return `=HYPERLINK("${url}","${url.replace('https://', '')}")`;
}

// const requests = [
//   {
//     'repeatCell': {
//       'range': {
//         'sheetId': 0,
//         'startRowIndex': 0,
//         'endRowIndex': 1,
//       },
//       'cell': {
//         'userEnteredFormat': {
//           'bold': true,
//         },
//       },
//     },
//     'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
//   }, {
//     'updateSheetProperties': {
//       'properties': {
//         'sheetId': 0,
//         'gridProperties': {
//           'frozenRowCount': 1,
//         },
//       },
//       'fields': 'gridProperties.frozenRowCount',
//     },
//   },
// ];

async function appendToSheet(googleSheetsInstance, auth, data, range) {
  // console.log('>>>>', data);
  await googleSheetsInstance.spreadsheets.values.append({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
    resource: {values: data},
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
  });
}

async function clearSheet(googleSheetsInstance, auth) {
  await googleSheetsInstance.spreadsheets.values.clear({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });
}

async function updateSheet(googleSheetsInstance, auth, data) {
  // console.log('>>>>', data);
  await googleSheetsInstance.spreadsheets.values.update({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    resource: {values: data},
  });
}

authorise();
