
import fs from 'fs/promises';
import path from 'path';
import url from 'url';

export default async function handler(req, res) {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const offersPath = path.resolve(__dirname, '../../public/data/offers.json');

  try {
    const offersData = await fs.readFile(offersPath, 'utf-8');
    const offers = JSON.parse(offersData);

    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const countryCode = searchParams.get('countryCode');
    const phoneId = searchParams.get('phoneId');


    if (!countryCode || !phoneId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'countryCode and phoneId are required' }));
      return;
    }

    const countryOffers = offers[countryCode.toUpperCase()];

    if (!countryOffers) {
      res.statusCode = 200; // Return empty array if no offers for the country
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify([]));
      return;
    }

    const phoneOffers = countryOffers.filter(offer => offer.phoneId === parseInt(phoneId));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(phoneOffers));
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Internal Server Error' }));
  }
}
