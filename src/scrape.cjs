const https = require('https');

function findImages(query) {
  return new Promise((resolve) => {
    https.get(`https://unsplash.com/s/photos/${encodeURIComponent(query)}`, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const matches = data.match(/photo-[a-zA-Z0-9\-]+/g) || [];
        resolve(Array.from(new Set(matches)).slice(0, 10));
      });
    });
  });
}

(async () => {
  const queries = [
    'pixie haircut woman',
    'bob haircut woman',
    'straight hair woman',
    'wavy hair woman',
    'curly hair woman',
    'fade haircut man',
    'buzz cut man',
    'pompadour man',
    'slick back hair man'
  ];
  
  const results = {};
  for (const q of queries) {
    results[q] = await findImages(q);
  }
  console.log(JSON.stringify(results, null, 2));
})();
