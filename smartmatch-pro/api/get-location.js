// d:\Projects\smartmatch-pwa\api\get-location.js
// This is an example of a serverless function.
// On platforms like Vercel, Netlify, or DigitalOcean, you would typically
// create an `api/` directory at the root of your project and place this file inside.

export default async function handler(req, res) {
  // Vercel provides the user's IP address directly on the request object.
  const ip = req.ip || '8.8.8.8'; // Fallback for local testing

  // We'll use a free, no-key-required IP geolocation API for this example.
  // For production, consider a more robust service with an API key.
  const GEO_API_URL = `https://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,query`;

  try {
    const geoResponse = await fetch(GEO_API_URL);
    const geoData = await geoResponse.json();

    if (geoData.status !== 'success') {
      // If the geolocation API fails, return a successful response with null data.
      return res.status(200).json(null);
    }

    // Send the relevant location data back to the frontend.
    res.status(200).json({
      ip: geoData.query,
      city: geoData.city,
      region: geoData.regionName,
      country: geoData.country,
      countryCode: geoData.countryCode,
      latitude: geoData.lat,
      longitude: geoData.lon,
    });

  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred.', details: error.message });
  }
}