// serverless function that runs on Vercel

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Your API key stored securely in environment variable
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { stores } = req.body;

  if (!stores || !Array.isArray(stores)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const SMU_LOCATION = { lat: 1.2966, lng: 103.8501 };
    const storeResults = [];

    for (const storeName of stores) {
      try {
        // Search for the place
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(storeName + ' Singapore Management University')}&location=${SMU_LOCATION.lat},${SMU_LOCATION.lng}&radius=500&key=${API_KEY}`;
        
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.status === 'OK' && searchData.results.length > 0) {
          const placeId = searchData.results[0].place_id;

          // Get place details
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,opening_hours,formatted_address,rating&key=${API_KEY}`;
          
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();

          if (detailsData.status === 'OK') {
            const place = detailsData.result;
            storeResults.push({
              name: storeName.replace(' SMU', ''),
              isOpen: place.opening_hours?.open_now ?? null,
              hours: place.opening_hours?.weekday_text || [],
              address: place.formatted_address || '',
              rating: place.rating || null,
              error: false
            });
          } else {
            storeResults.push({
              name: storeName.replace(' SMU', ''),
              isOpen: null,
              hours: [],
              address: '',
              rating: null,
              error: true
            });
          }
        } else {
          storeResults.push({
            name: storeName.replace(' SMU', ''),
            isOpen: null,
            hours: [],
            address: '',
            rating: null,
            error: true
          });
        }
      } catch (error) {
        console.error(`Error fetching ${storeName}:`, error);
        storeResults.push({
          name: storeName.replace(' SMU', ''),
          isOpen: null,
          hours: [],
          address: '',
          rating: null,
          error: true
        });
      }
    }

    return res.status(200).json({ stores: storeResults });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch store data' });
  }
}