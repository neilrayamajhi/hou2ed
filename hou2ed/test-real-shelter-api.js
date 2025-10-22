#!/usr/bin/env node

/**
 * Test Real Shelter Data APIs for Los Angeles
 * This tests various APIs to find working shelter data sources
 */

async function testOpenStreetMap() {
  console.log('🗺️  Testing OpenStreetMap Overpass API for LA Shelters...\n');

  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="shelter"](33.7,-118.7,34.4,-117.9);
      node["social_facility"="shelter"](33.7,-118.7,34.4,-117.9);
      node["social_facility"="homeless_shelter"](33.7,-118.7,34.4,-117.9);
      way["amenity"="shelter"](33.7,-118.7,34.4,-117.9);
      way["social_facility"="shelter"](33.7,-118.7,34.4,-117.9);
    );
    out body;
  `.trim();

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const shelters = data.elements.filter(e => e.tags?.name);

    console.log(`✅ Found ${data.elements.length} shelter nodes/ways in LA`);
    console.log(`   ${shelters.length} have names\n`);

    if (shelters.length > 0) {
      console.log('📍 Sample Real Shelters from OpenStreetMap:');
      console.log('--------------------------------------------');
      shelters.slice(0, 3).forEach(shelter => {
        console.log(`• ${shelter.tags.name || 'Unnamed'}`);
        if (shelter.tags['social_facility:for']) {
          console.log(`  For: ${shelter.tags['social_facility:for']}`);
        }
        if (shelter.tags.operator) {
          console.log(`  Operator: ${shelter.tags.operator}`);
        }
        if (shelter.tags.website) {
          console.log(`  Website: ${shelter.tags.website}`);
        }
        console.log(`  Location: ${shelter.lat}, ${shelter.lon}\n`);
      });
    }

    return true;
  } catch (error) {
    console.log('❌ OpenStreetMap API Error:', error.message);
    return false;
  }
}

async function testLACity311() {
  console.log('🏙️  Testing LA City 311 Data Portal...\n');

  try {
    // LA City has 311 data about homeless encampments which might have related shelter info
    const url = 'https://data.lacity.org/resource/az43-p47q.json?$limit=1';

    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ LA City 311 API is accessible');
      console.log('   (This has encampment data, not direct shelter data)\n');
      return true;
    }
  } catch (error) {
    console.log('❌ LA City API Error:', error.message);
  }
  return false;
}

async function main() {
  console.log('============================================');
  console.log('🔍 REAL SHELTER DATA API TEST');
  console.log('============================================\n');

  const osmWorking = await testOpenStreetMap();
  const cityWorking = await testLACity311();

  console.log('============================================');
  console.log('📊 SUMMARY');
  console.log('============================================');

  if (osmWorking) {
    console.log('✅ OpenStreetMap Overpass API: WORKING');
    console.log('   - Real shelter locations in LA');
    console.log('   - Community-maintained data');
    console.log('   - No API key required');
  }

  if (cityWorking) {
    console.log('✅ LA City Data Portal: ACCESSIBLE');
    console.log('   - Various city datasets available');
  }

  console.log('\n🔍 LAHSA Direct API: NOT FOUND');
  console.log('   - LAHSA uses Power BI dashboards instead');
  console.log('   - No public REST API documented');
  console.log('   - Data available via dashboard downloads only');

  console.log('\n💡 RECOMMENDATION:');
  console.log('   1. Use OpenStreetMap for real shelter locations');
  console.log('   2. Keep LAHSA mock data for realistic availability');
  console.log('   3. Consider web scraping LAHSA dashboards for updates');

  console.log('\n✨ Your app already uses OpenStreetMap as fallback!');
  console.log('   See: app/src/services/shelterService.ts\n');
}

main().catch(console.error);