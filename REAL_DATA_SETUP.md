# 🏠 Getting Real Shelter Availability Data for HOU2ED

## Quick Start - Get Real Data in 10 Minutes

### Option 1: 211 API (Recommended - Free)
211 is a national helpline that maintains real-time shelter availability data.

1. **Register for API Access:**
   - Visit: https://www.211.org/api
   - Or for LA: https://developers.211la.org/
   - Sign up for free developer account
   - Get your API key

2. **Add to your `.env` file:**
   ```
   EXPO_PUBLIC_211_API_KEY=your_api_key_here
   ```

3. **Test it:**
   ```bash
   curl -X POST https://api.211la.org/api/v1/search/programs \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"keyword": "emergency shelter", "location": {"latitude": 34.0522, "longitude": -118.2437}}'
   ```

### Option 2: City-Specific Systems (Free, Immediate)

#### Los Angeles - LA-HOP
- **Website:** https://www.lahsa.org/portal/apps/la-hop/
- **What it provides:** Real-time bed availability for all LA County shelters
- **How to access:**
  - Public website (can scrape with permission)
  - API available for registered partners
  - Contact: lahop@lahsa.org

#### New York City - NYC HOPE
- **Website:** https://a071-hope.nyc.gov/hope
- **What it provides:** Live shelter census for NYC
- **API Endpoint:** `https://a071-hope.nyc.gov/hope/api/v1/shelters`
- **No API key required** for public data

#### San Francisco
- **Website:** https://sf.gov/location/shelter-reservation-system
- **ONE System:** Coordinated entry for all SF shelters
- **API:** Contact HSH (Dept of Homelessness & Supportive Housing)

## 📊 Data Sources Comparison

| Source | Coverage | Real-Time | API Available | Cost | Difficulty |
|--------|----------|-----------|---------------|------|------------|
| 211 | National | Yes (2-4 hr delay) | Yes | Free | Easy |
| LA-HOP | LA County | Yes | Yes (partners) | Free | Medium |
| NYC HOPE | NYC | Yes | Yes | Free | Easy |
| HMIS | Regional | Yes | Restricted | Free | Hard |
| Web Scraping | Any | Varies | N/A | $$ | Medium |
| Direct Partnership | Specific | Yes | Custom | Free | Hard |

## 🔌 Integration Examples

### 211 Integration (JavaScript/React Native)
```javascript
// app/src/services/realTimeAvailability.ts

const API_KEY = process.env.EXPO_PUBLIC_211_API_KEY;

async function getShelterAvailability(lat, lon) {
  const response = await fetch('https://api.211la.org/api/v1/search/programs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyword: 'emergency shelter',
      location: { latitude: lat, longitude: lon, radius: 10 }
    })
  });

  const data = await response.json();

  return data.programs.map(program => ({
    name: program.agency_name,
    available: program.availability_status === 'Available',
    bedsAvailable: program.available_beds || 0,
    waitlist: program.waitlist_count || 0,
    lastUpdated: program.last_updated
  }));
}
```

### LA-HOP Web Scraping (Legal with robots.txt compliance)
```javascript
async function getLAHOPAvailability() {
  // Check robots.txt first
  const response = await fetch('https://www.lahsa.org/robots.txt');

  // If allowed, scrape the public data
  const pageResponse = await fetch('https://www.lahsa.org/portal/apps/la-hop/');
  const html = await pageResponse.text();

  // Parse availability from HTML
  const regex = /Beds Available: (\d+)/g;
  const matches = [...html.matchAll(regex)];

  return matches.map(match => ({
    bedsAvailable: parseInt(match[1])
  }));
}
```

## 🤝 Getting Partnership Access

### For Nonprofits/Students:
1. **Email Template:**
   ```
   Subject: API Access Request for Homeless Services App

   Dear [Shelter Network],

   We're building HOU2ED, a free app to help people experiencing
   homelessness find available shelter beds in real-time.

   We'd like to request API access to display your current bed
   availability. We will:
   - Display your data accurately
   - Include your intake requirements
   - Drive qualified referrals to your shelter
   - Never charge users for access

   Can we schedule a brief call to discuss?

   Thank you,
   [Your Name]
   ```

2. **Who to Contact:**
   - Salvation Army: tech@salvationarmyusa.org
   - Catholic Charities: info@catholiccharitiesusa.org
   - Local CoC: Find at https://www.hudexchange.info/grantees/

### For Commercial Apps:
- Consider revenue sharing with shelters
- Offer free analytics dashboard
- Provide intake management tools
- Share anonymized usage data

## 🚨 Important Legal Considerations

### ✅ Allowed:
- Using public APIs with registration
- Scraping public data following robots.txt
- Caching data for performance (with limits)
- Aggregating multiple sources

### ❌ Not Allowed:
- Scraping without checking robots.txt
- Exceeding API rate limits
- Selling shelter data
- Misrepresenting availability

### Privacy Requirements:
- Never show exact shelter addresses for DV shelters
- Respect "hidden" or "confidential" flags
- Don't store personally identifiable information
- Follow HMIS privacy standards

## 🛠️ Technical Implementation

### 1. Set Up Environment Variables
```bash
# .env.local
EXPO_PUBLIC_211_API_KEY=your_211_api_key
EXPO_PUBLIC_LAHOP_API_KEY=your_lahop_key
EXPO_PUBLIC_NYC_HOPE_TOKEN=your_nyc_token
EXPO_PUBLIC_SCRAPER_API_KEY=your_scraper_key
```

### 2. Create Availability Service
```javascript
// services/availabilityService.ts
import { fetch211Data } from './211Service';
import { fetchLAHOPData } from './lahopService';
import { fetchNYCData } from './nycService';

export async function getRealTimeAvailability(location) {
  // Try multiple sources in parallel
  const [data211, dataLAHOP, dataNYC] = await Promise.all([
    fetch211Data(location).catch(() => null),
    fetchLAHOPData(location).catch(() => null),
    fetchNYCData(location).catch(() => null),
  ]);

  // Merge and deduplicate results
  const allData = [...(data211 || []), ...(dataLAHOP || []), ...(dataNYC || [])];

  return deduplicateShelters(allData);
}
```

### 3. Update UI to Show Real Status
```javascript
// components/ShelterCard.tsx
function ShelterCard({ shelter }) {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRealTimeAvailability(shelter.id)
      .then(setAvailability)
      .finally(() => setLoading(false));
  }, [shelter.id]);

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <Badge color={availability?.bedsAvailable > 0 ? 'green' : 'red'}>
        {availability?.bedsAvailable > 0
          ? `${availability.bedsAvailable} beds available`
          : 'FULL - Waitlist available'}
      </Badge>
      <Text>Last updated: {availability?.lastUpdated}</Text>
      <Text>Source: {availability?.source}</Text>
    </Card>
  );
}
```

## 📈 Expected Results

With real data integration, you'll see:
- **Accurate bed counts** updated every 2-4 hours
- **Waitlist lengths** for full shelters
- **Intake schedules** and requirements
- **Special population** availability (families, veterans, youth)
- **Weather-activated** beds during extreme conditions

## 🚀 Next Steps

1. **Start with 211 API** - easiest and most comprehensive
2. **Add city-specific systems** for your target market
3. **Partner with 2-3 local shelters** for direct access
4. **Build trust** by sharing your impact metrics
5. **Scale gradually** to more regions

## 📞 Need Help?

- **211 API Support:** api-support@211.org
- **HMIS Questions:** info@hudexchange.info
- **Technical Issues:** Create issue on GitHub
- **Partnerships:** Contact local Continuum of Care

---

**Remember:** Real data saves lives. Every accurate bed count helps someone find shelter faster.