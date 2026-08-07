import gplay from 'google-play-scraper';
import fs from 'fs';

// Your App Package Name
const MY_APP_ID = 'weatherradar.livemaps.free';

// Competitors to track alongside your app
const COMPETITORS = [
  'com.wunderground.android.weather'
];

// Keywords you want to track daily
const KEYWORDS = [
  'weather radar'
];

async function trackRanks() {
  const date = new Date().toISOString().split('T')[0];
  console.log(`Checking ranks for: ${date}`);

  const results = [];

  for (const keyword of KEYWORDS) {
    try {
      const searchResults = await gplay.search({
        term: keyword,
        num: 100,
        country: 'us',
        lang: 'en'
      });

      const myRankIndex = searchResults.findIndex(app => app.appId === MY_APP_ID);
      const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '>100';

      const competitorRanks = {};
      COMPETITORS.forEach(comp => {
        const compIndex = searchResults.findIndex(app => app.appId === comp);
        competitorRanks[comp] = compIndex !== -1 ? compIndex + 1 : '>100';
      });

      results.push({ date, keyword, myRank, ...competitorRanks });
      console.log(`Keyword: "${keyword}" | Your Rank: #${myRank}`);
    } catch (error) {
      console.error(`Error on keyword "${keyword}":`, error.message);
    }
  }

  saveToCSV(results);
}

function saveToCSV(data) {
  const filename = 'rank_history.csv';
  const headers = 'Date,Keyword,My App Rank,' + COMPETITORS.join(',') + '\n';

  const rows = data.map(row => {
    const compValues = COMPETITORS.map(c => row[c]).join(',');
    return `${row.date},"${row.keyword}",${row.myRank},${compValues}`;
  }).join('\n') + '\n';

  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, headers + rows);
  } else {
    fs.appendFileSync(filename, rows);
  }
  console.log('Saved to rank_history.csv successfully!');
}

trackRanks();
