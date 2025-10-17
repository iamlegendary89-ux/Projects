export default function handler(req, res) {
  // Vercel provides the user's country via x-vercel-ip-country header
  const country = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || 'US';
  res.status(200).json({ country });
}
