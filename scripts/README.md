# OSM Import Scripts

This directory contains scripts for importing external data into the Hou2ed database.

## import-osm-listings.ts

Imports OpenStreetMap shelter data as internal listings.

### Prerequisites

1. Run the database migration first:
   ```bash
   # Apply the migration to your Supabase database
   supabase db push
   ```

2. Set environment variables:
   ```bash
   export SUPABASE_URL="your-project-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

   **Important:** Use the **service role key**, not the anon key. The service role key bypasses RLS and is required for this import script.

### Running the Script

```bash
# Install dependencies if needed
npm install

# Run the import
npx ts-node scripts/import-osm-listings.ts
```

### What It Does

1. ✅ Verifies the system provider account exists
2. 🌍 Fetches shelter data from OpenStreetMap (Los Angeles area)
3. 🔄 Converts OSM data to internal listing format
4. 🗑️ Clears old OSM-imported listings
5. 💾 Inserts new listings with `source='osm'`
6. 📊 Provides summary statistics

### Customization

Edit these constants in the script to change behavior:

- `DEFAULT_LAT` / `DEFAULT_LNG`: Center coordinates for search
- `DEFAULT_RADIUS_KM`: Search radius (default: 50km)
- `BATCH_SIZE`: Number of listings per database batch (default: 50)

### Scheduling

To keep OSM data fresh, schedule this script to run periodically:

**Using cron (Linux/Mac):**
```bash
# Run daily at 3 AM
0 3 * * * cd /path/to/hou2ed && npx ts-node scripts/import-osm-listings.ts >> logs/osm-import.log 2>&1
```

**Using GitHub Actions:**
```yaml
name: Import OSM Listings
on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC
  workflow_dispatch:  # Manual trigger
jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx ts-node scripts/import-osm-listings.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Troubleshooting

**Error: "System provider not found"**
- Run the migration: `supabase db push`
- Verify the migration applied: `supabase db diff`

**Error: "Missing required environment variables"**
- Ensure both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check you're using the service role key, not the anon key

**No listings imported**
- Check Overpass API is accessible
- Verify the search radius includes shelter locations
- Check console output for specific errors

### Security Notes

🔐 **Never commit the service role key to version control!**

The service role key has full database access and bypasses RLS. Keep it secure:
- Use environment variables
- Store in secrets management (GitHub Secrets, AWS Secrets Manager, etc.)
- Rotate keys regularly
- Restrict access to production keys
