// api/stores.js - Combines SMU official hours + Google ratings
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  const { stores } = req.body;

  if (!stores || !Array.isArray(stores)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // Fetch the SMU food listing page for hours
    const smuResponse = await fetch('https://www.smu.edu.sg/campus-life/visiting-smu/food-beverages-listing');
    const html = await smuResponse.text();

    const storeResults = await Promise.all(stores.map(async (storeName) => {
      const cleanName = storeName.replace(' SMU', '');
      
      // Get hours from SMU website
      const { hours, isOpen } = extractHoursFromSMU(html, cleanName);
      
      // Get rating from Google Places
      let rating = null;
      if (API_KEY) {
        rating = await getGoogleRating(storeName, API_KEY);
      }

      return {
        name: cleanName,
        isOpen,
        hours,
        rating,
        error: hours.length === 0
      };
    }));

    return res.status(200).json({ stores: storeResults });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to fetch store data' });
  }
}

function extractHoursFromSMU(html, storeName) {
  const cleanName = storeName.toLowerCase();
  
  // Try to find the store in the HTML
  const storeRegex = new RegExp(`<h3[^>]*>([^<]*${cleanName}[^<]*)</h3>`, 'i');
  const match = html.match(storeRegex);

  if (!match) {
    return { hours: [], isOpen: null };
  }

  // Extract the section containing this store's info
  const storeIndex = html.indexOf(match[0]);
  const nextStoreIndex = html.indexOf('<h3', storeIndex + 1);
  const storeSection = html.substring(storeIndex, nextStoreIndex > 0 ? nextStoreIndex : storeIndex + 2000);

  // Extract opening hours
  const hoursRegex = /<strong>Opening Hours<\/strong>\s*<\/p>\s*<p>(.*?)<\/p>/is;
  const hoursMatch = storeSection.match(hoursRegex);
  
  let hours = [];
  let isOpen = null;

  if (hoursMatch) {
    const hoursText = hoursMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    hours = hoursText.split('\n').filter(h => h.trim());
    isOpen = checkIfOpen(hours);
  }

  return { hours, isOpen };
}

async function getGoogleRating(storeName, apiKey) {
  try {
    const SMU_LOCATION = { lat: 1.2966, lng: 103.8501 };
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(storeName + ' Singapore Management University')}&location=${SMU_LOCATION.lat},${SMU_LOCATION.lng}&radius=500&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status === 'OK' && searchData.results.length > 0) {
      const placeId = searchData.results[0].place_id;
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating&key=${apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.status === 'OK' && detailsData.result.rating) {
        return detailsData.result.rating;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching rating for ${storeName}:`, error);
    return null;
  }
}

function checkIfOpen(hours) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDayName = dayNames[currentDay];

  for (const schedule of hours) {
    const scheduleLower = schedule.toLowerCase();
    
    let appliesToday = false;

    if (scheduleLower.includes(currentDayName)) {
      appliesToday = true;
    } else if (scheduleLower.includes('-')) {
      const dayRangeMatch = scheduleLower.match(/([a-z]{3})-([a-z]{3})/);
      if (dayRangeMatch) {
        const startDay = dayNames.indexOf(dayRangeMatch[1]);
        const endDay = dayNames.indexOf(dayRangeMatch[2]);
        if (startDay <= currentDay && currentDay <= endDay) {
          appliesToday = true;
        }
      }
    }

    if (!appliesToday) continue;

    const timeMatch = schedule.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (!timeMatch) continue;

    const openTime = parseTime(timeMatch[1]);
    const closeTime = parseTime(timeMatch[2]);

    if (openTime <= currentTime && currentTime < closeTime) {
      return true;
    }
  }

  return false;
}

function parseTime(timeStr) {
  const cleaned = timeStr.toLowerCase().replace(/\s/g, '');
  let hours = 0;
  let minutes = 0;

  const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?(am|pm)/);
  if (!match) return 0;

  hours = parseInt(match[1]);
  minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}