import gplay from 'google-play-scraper';
import fs from 'fs';

const MY_APP_ID = 'weatherradar.livemaps.free';

const COMPETITORS = [
  { name: 'MyRadar', id: 'com.acmeaom.android.myradar' },
  { name: 'Clime (Apalon)', id: 'com.apalon.weatherradar.free' },
  { name: 'Weather Underground', id: 'com.wunderground.android.weather' },
  { name: 'WetterOnline', id: 'de.wetteronline.wetterapp' }
];

// Helper delay to avoid GitHub Action runner IP getting rate-limited (HTTP 429)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function loadKeywords() {
  const csvFile = 'total-performance-metrics.csv';
  
  if (!fs.existsSync(csvFile)) {
    console.warn(`⚠️ ${csvFile} not found! Falling back to default keywords.`);
    return ['weather radar', 'tornado', 'radar'];
  }

  try {
    const csvContent = fs.readFileSync(csvFile, 'utf-8');
    const lines = csvContent.split(/\r?\n/);

    const keywords = lines
      .slice(1)
      .map(line => {
        const firstCol = line.split(',')[0];
        return firstCol ? firstCol.trim().replace(/^"|"$/g, '') : '';
      })
      .filter(term => term && term !== 'All search terms' && term !== 'Other');

    console.log(`✅ Loaded ${keywords.length} keywords from ${csvFile}`);
    return keywords;
  } catch (error) {
    console.error(`Error reading ${csvFile}:`, error.message);
    return ['weather radar', 'tornado', 'radar'];
  }
}

const KEYWORDS = loadKeywords();

async function trackRanks() {
  const date = new Date().toISOString().split('T')[0];
  console.log(`Checking ranks for: ${date} (${KEYWORDS.length} terms)`);

  const results = [];

  for (let i = 0; i < KEYWORDS.length; i++) {
    const keyword = KEYWORDS[i];
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
        const compIndex = searchResults.findIndex(app => app.appId === comp.id);
        competitorRanks[comp.id] = compIndex !== -1 ? compIndex + 1 : '>100';
      });

      results.push({ date, keyword, myRank, ...competitorRanks });
      console.log(`[${i + 1}/${KEYWORDS.length}] "${keyword}" | Your Rank: #${myRank}`);

      // Pause 1.5 seconds between queries to prevent 429 Rate Limits
      await sleep(1500);

    } catch (error) {
      console.error(`Error on keyword "${keyword}":`, error.message);
      // Extra cooldown on error before continuing
      await sleep(3000);
    }
  }

  saveToCSV(results);
}

function saveToCSV(data) {
  const filename = 'rank_history.csv';
  const headers = 'Date,Keyword,My App Rank,' + COMPETITORS.map(c => `"${c.name}"`).join(',') + '\n';

  const rows = data.map(row => {
    const compValues = COMPETITORS.map(c => row[c.id]).join(',');
    return `"${row.date}","${row.keyword}",${row.myRank},${compValues}`;
  }).join('\n') + '\n';

  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, headers + rows);
  } else {
    fs.appendFileSync(filename, rows);
  }
  console.log('Saved to rank_history.csv successfully!');
}

trackRanks();
