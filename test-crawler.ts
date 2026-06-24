import * as cheerio from 'cheerio';

async function testCrawl() {
  try {
    const res = await fetch('https://chogia.vn/gia-sau-rieng/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(await res.text());
    let price = '';
    $('td').each((i, el) => {
      if ($(el).text().toLowerCase().includes('ri6') && !price) {
        price = $(el).next().text().trim();
      }
    });
    console.log("Sầu riêng Ri6:", price);
  } catch (e) {}

  try {
    const res = await fetch('https://chogia.vn/gia-tieu/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(await res.text());
    let price = '';
    $('td').each((i, el) => {
      if ($(el).text().toLowerCase().includes('chư sê') && !price) {
        price = $(el).next().text().trim();
      }
    });
    console.log("Tiêu Chư Sê:", price);
  } catch (e) {}

  try {
    const res = await fetch('https://chogia.vn/gia-lua-gao/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(await res.text());
    let price = '';
    $('td').each((i, el) => {
      if ($(el).text().toLowerCase().includes('đài thơm 8') && !price) {
        price = $(el).next().text().trim();
      }
    });
    console.log("Lúa Đài Thơm 8:", price);
  } catch (e) {}
}

testCrawl();
