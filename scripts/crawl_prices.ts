import * as cheerio from 'cheerio';

async function crawl() {
  const categories = [
    'https://chogia.vn/gia-ca-phe/',
    'https://chogia.vn/gia-tieu/',
    'https://chogia.vn/gia-sau-rieng/',
    'https://chogia.vn/gia-lua-gao/',
    'https://chogia.vn/gia-nong-san/',
    'https://chogia.vn/gia-trai-cay/'
  ];
  
  for (const url of categories) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const $ = cheerio.load(html);
      
      console.log(`\n--- ${url} ---`);
      $('table tr').each((i, el) => {
        const rowText = $(el).text().replace(/\s+/g, ' ').trim();
        if (rowText.length > 0 && rowText.length < 100) {
          console.log(rowText);
        }
      });
    } catch (e) {
      console.error(`Error fetching ${url}:`, e);
    }
  }
}

crawl();
