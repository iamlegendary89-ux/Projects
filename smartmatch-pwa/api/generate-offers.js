// Temporary: Simplified API that returns static offers without any dependencies

export default async function handler(req, res) {
  console.log('API called: generate-offers', req.method);

  // Accept any method for now to test Vercel function
  // if (req.method !== 'POST') {
  //   return res.status(405).json({ error: 'Method not allowed' });
  // }

  console.log('Request body:', req.body);

  const offers = [
    {
      retailer: "Online Store",
      price: "Check pricing",
      url: "https://example.com"
    },
    {
      retailer: "Local Dealer",
      price: "Contact for quote",
      url: "mailto:info@example.com"
    },
    {
      retailer: "Marketplace",
      price: "Compare prices",
      url: "https://example.com/market"
    }
  ];

  console.log('Returning offers:', offers);

  res.status(200).json(offers);
}
