import Exa from 'exa-js';
import { config } from 'dotenv';
import type { TripPlanningFilters } from '@shared/schema';

config();

// Initialize Exa client
const exa = new Exa(process.env.EXASEARCH_API_KEY);

export interface ExaTravelResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  score: number;
  text: string;
  highlights: string[];
  highlightScores: number[];
}

export interface ProcessedTravelInfo {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  category: 'accommodation' | 'restaurant' | 'activity' | 'attraction' | 'transportation';
  location: string;
  rating?: number;
  priceRange?: string;
  imageUrl?: string;
  address?: string;
  hours?: string;
  contact?: string;
}

export async function searchTravelInfoWithExa(criteria: TripPlanningFilters): Promise<ProcessedTravelInfo[]> {
  try {
    if (!process.env.EXASEARCH_API_KEY || process.env.EXASEARCH_API_KEY === 'your_exa_api_key_here') {
      throw new Error('Exa API key is not configured. Please set EXASEARCH_API_KEY in your .env file.');
    }

    // Build comprehensive travel search queries
    const searchQueries = buildTravelSearchQueries(criteria);
    
    console.log('🌍 Searching for travel information:', searchQueries);
    
    const allResults: ExaTravelResult[] = [];
    
    // Search with multiple targeted queries
    for (const query of searchQueries) {
      try {
        console.log(`🔍 Executing: "${query}"`);
        
        const searchResponse = await exa.searchAndContents(query, {
          type: "neural",
          useAutoprompt: false,
          numResults: 10,
          text: true,
          highlights: true,
          includeDomains: [
            "tripadvisor.com",
            "booking.com",
            "airbnb.com",
            "expedia.com",
            "hotels.com",
            "yelp.com",
            "timeout.com",
            "lonelyplanet.com",
            "fodors.com",
            "frommers.com",
            "viator.com",
            "getyourguide.com",
            "klook.com",
            "tiqets.com",
            "opentable.com",
            "resy.com",
            "zomato.com",
            "kayak.com",
            "skyscanner.com",
            "rome2rio.com"
          ],
          startPublishedDate: getDateDaysAgo(365), // Travel info from last year
        });

        if (searchResponse.results && searchResponse.results.length > 0) {
          console.log(`🏨 Found ${searchResponse.results.length} travel results for: "${query}"`);
          
          // Filter for relevant travel content
          const travelInfo = searchResponse.results.filter(result => {
            return isTravelContent(result);
          });
          
          console.log(`✅ Kept ${travelInfo.length} relevant travel items from this query`);
          
          allResults.push(...travelInfo.map(result => ({
            id: result.id,
            title: result.title,
            url: result.url,
            publishedDate: result.publishedDate || new Date().toISOString(),
            author: result.author || 'Unknown',
            score: result.score || 0,
            text: result.text || '',
            highlights: result.highlights || [],
            highlightScores: result.highlightScores || []
          })));
        } else {
          console.log(`❌ No results found for: "${query}"`);
        }
      } catch (queryError) {
        console.error(`❌ Error with query "${query}":`, queryError);
        // Continue with other queries
      }
    }

    // Remove duplicates based on URL
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    console.log(`🌍 FINAL RESULT: ${uniqueResults.length} unique travel items found`);

    // Process and structure the results
    const processedResults = await processTravelResults(uniqueResults, criteria);
    
    // Sort by relevance score
    processedResults.sort((a, b) => {
      const aResult = uniqueResults.find(r => r.id === a.id);
      const bResult = uniqueResults.find(r => r.id === b.id);
      const aScore = aResult?.score || 0;
      const bScore = bResult?.score || 0;
      return bScore - aScore;
    });

    return processedResults.slice(0, 30); // Return top 30 results
    
  } catch (error) {
    console.error('❌ Error searching travel info with Exa:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Exa API key is not configured properly. Please check your .env file.');
    }
    throw new Error('Failed to search travel information. Please try again.');
  }
}

function buildTravelSearchQueries(criteria: TripPlanningFilters): string[] {
  const queries: string[] = [];
  
  const destination = criteria.destination || 'popular destination';
  const travelStyle = criteria.travelStyle || '';
  const budget = criteria.budget ? (criteria.budget > 2000 ? 'luxury' : criteria.budget > 1000 ? 'mid-range' : 'budget') : '';
  
  // Hotel and accommodation searches
  queries.push(`site:booking.com "${destination}" hotels ${budget} ${travelStyle}`);
  queries.push(`site:airbnb.com "${destination}" ${travelStyle} accommodation`);
  queries.push(`site:hotels.com "${destination}" ${budget} hotels`);
  
  // Restaurant and food searches
  queries.push(`site:tripadvisor.com "${destination}" restaurants best food`);
  queries.push(`site:yelp.com "${destination}" restaurants dining`);
  queries.push(`site:opentable.com "${destination}" restaurants reservations`);
  queries.push(`site:timeout.com "${destination}" best restaurants food guide`);
  
  // Activities and attractions
  queries.push(`site:tripadvisor.com "${destination}" things to do attractions`);
  queries.push(`site:viator.com "${destination}" tours activities`);
  queries.push(`site:getyourguide.com "${destination}" attractions tours`);
  queries.push(`site:klook.com "${destination}" activities experiences`);
  
  // Travel guides and planning
  queries.push(`site:lonelyplanet.com "${destination}" travel guide`);
  queries.push(`site:fodors.com "${destination}" travel guide`);
  queries.push(`site:frommers.com "${destination}" travel guide`);
  
  // Transportation
  queries.push(`site:kayak.com flights to "${destination}"`);
  queries.push(`site:rome2rio.com "${destination}" transportation`);
  
  // Activity-specific searches
  if (criteria.activities && criteria.activities.length > 0) {
    criteria.activities.forEach(activity => {
      queries.push(`site:tripadvisor.com "${destination}" "${activity}" activities`);
      queries.push(`site:viator.com "${destination}" "${activity}" tours`);
    });
  }
  
  // Duration-specific searches
  if (criteria.duration) {
    const durationText = criteria.duration === 1 ? 'day trip' : 
                         criteria.duration <= 3 ? 'weekend' : 
                         criteria.duration <= 7 ? 'week' : 'long trip';
    queries.push(`"${destination}" ${durationText} itinerary guide`);
    queries.push(`site:timeout.com "${destination}" ${durationText} guide`);
  }
  
  console.log(`🌍 Generated ${queries.length} travel search queries`);
  return queries;
}

function isTravelContent(result: ExaTravelResult): boolean {
  const url = result.url.toLowerCase();
  const title = result.title.toLowerCase();
  const text = result.text.toLowerCase();
  
  // Must be from travel-related domains or contain travel content
  const hasTravelUrl = 
    url.includes('tripadvisor') ||
    url.includes('booking.com') ||
    url.includes('airbnb') ||
    url.includes('expedia') ||
    url.includes('hotels.com') ||
    url.includes('yelp.com') ||
    url.includes('timeout.com') ||
    url.includes('lonelyplanet') ||
    url.includes('fodors') ||
    url.includes('frommers') ||
    url.includes('viator') ||
    url.includes('getyourguide') ||
    url.includes('klook') ||
    url.includes('opentable') ||
    url.includes('resy.com') ||
    url.includes('kayak') ||
    url.includes('skyscanner');
  
  if (!hasTravelUrl) {
    return false;
  }
  
  // Must have travel-related content
  const hasTravelContent = 
    title.includes('hotel') ||
    title.includes('restaurant') ||
    title.includes('attraction') ||
    title.includes('tour') ||
    title.includes('activity') ||
    title.includes('travel') ||
    title.includes('visit') ||
    title.includes('guide') ||
    text.includes('travel') ||
    text.includes('visit') ||
    text.includes('hotel') ||
    text.includes('restaurant') ||
    text.includes('attraction') ||
    text.includes('booking') ||
    text.includes('reservation');
  
  return hasTravelContent;
}

async function processTravelResults(results: ExaTravelResult[], criteria: TripPlanningFilters): Promise<ProcessedTravelInfo[]> {
  return results.map(result => {
    const travelInfo = extractTravelInformation(result, criteria);
    
    return {
      id: result.id,
      title: travelInfo.title || result.title,
      description: travelInfo.description || (result.text.length > 300 ? result.text.substring(0, 300) + '...' : result.text),
      url: result.url,
      source: extractSourceFromUrl(result.url),
      category: travelInfo.category,
      location: travelInfo.location || criteria.destination || 'Location not specified',
      rating: travelInfo.rating,
      priceRange: travelInfo.priceRange,
      imageUrl: travelInfo.imageUrl,
      address: travelInfo.address,
      hours: travelInfo.hours,
      contact: travelInfo.contact
    };
  });
}

function extractTravelInformation(result: ExaTravelResult, criteria: TripPlanningFilters) {
  const text = result.text.toLowerCase();
  const originalText = result.text;
  const title = result.title;
  const url = result.url.toLowerCase();
  
  // Determine category based on URL and content
  let category: 'accommodation' | 'restaurant' | 'activity' | 'attraction' | 'transportation' = 'attraction';
  
  if (url.includes('booking.com') || url.includes('hotels.com') || url.includes('airbnb') || 
      text.includes('hotel') || text.includes('accommodation') || text.includes('stay')) {
    category = 'accommodation';
  } else if (url.includes('yelp') || url.includes('opentable') || url.includes('resy') ||
             text.includes('restaurant') || text.includes('dining') || text.includes('food')) {
    category = 'restaurant';
  } else if (url.includes('viator') || url.includes('getyourguide') || url.includes('klook') ||
             text.includes('tour') || text.includes('activity') || text.includes('experience')) {
    category = 'activity';
  } else if (url.includes('kayak') || url.includes('skyscanner') || url.includes('rome2rio') ||
             text.includes('flight') || text.includes('transport')) {
    category = 'transportation';
  }
  
  // Extract rating
  const ratingPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*5/gi,
    /(\d+(?:\.\d+)?)\s*stars?/gi,
    /rating[:\s]*(\d+(?:\.\d+)?)/gi,
    /(\d+(?:\.\d+)?)\s*star/gi
  ];
  
  let rating: number | undefined;
  for (const pattern of ratingPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const ratingValue = parseFloat(match[1]);
      if (ratingValue >= 0 && ratingValue <= 5) {
        rating = ratingValue;
        break;
      }
    }
  }
  
  // Extract price range
  const pricePatterns = [
    /\$+/g, // $ symbols
    /\$\d+(?:,\d{3})*(?:\.\d{2})?/g, // Actual prices
    /(?:from|starting)\s*\$\d+/gi,
    /budget|cheap|affordable|expensive|luxury|premium/gi
  ];
  
  let priceRange: string | undefined;
  for (const pattern of pricePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      if (match[0].includes('$$$')) priceRange = 'Expensive';
      else if (match[0].includes('$$')) priceRange = 'Moderate';
      else if (match[0].includes('$')) priceRange = 'Budget';
      else if (match[0].toLowerCase().includes('luxury')) priceRange = 'Luxury';
      else if (match[0].toLowerCase().includes('budget')) priceRange = 'Budget';
      else priceRange = match[0];
      break;
    }
  }
  
  // Extract address
  const addressPatterns = [
    /address[:\s]+([^,\n]+(?:,\s*[^,\n]+)*)/gi,
    /located at[:\s]+([^,\n]+)/gi,
    /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)[^,\n]*)/gi
  ];
  
  let address: string | undefined;
  for (const pattern of addressPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      address = match[1]?.trim();
      if (address && address.length > 10 && address.length < 200) {
        break;
      }
    }
  }
  
  // Extract hours
  const hoursPatterns = [
    /hours?[:\s]+([^,\n]+)/gi,
    /open[:\s]+([^,\n]+)/gi,
    /(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))/gi
  ];
  
  let hours: string | undefined;
  for (const pattern of hoursPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      hours = match[1]?.trim();
      if (hours && hours.length < 100) {
        break;
      }
    }
  }
  
  // Extract contact info
  const contactPatterns = [
    /phone[:\s]+([+\d\s\-\(\)]+)/gi,
    /tel[:\s]+([+\d\s\-\(\)]+)/gi,
    /(\+\d{1,3}\s*\d{3,4}\s*\d{3,4}\s*\d{3,4})/gi
  ];
  
  let contact: string | undefined;
  for (const pattern of contactPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      contact = match[1]?.trim();
      break;
    }
  }
  
  // Get description from highlights or meaningful text
  let description: string;
  if (result.highlights.length > 0) {
    description = result.highlights.join(' ').substring(0, 400);
  } else {
    // Extract meaningful sentences from text
    const sentences = originalText.split(/[.!?]+/)
      .filter(s => s.trim().length > 30 && s.trim().length < 200)
      .filter(s => !s.toLowerCase().includes('cookie'))
      .filter(s => !s.toLowerCase().includes('privacy'));
    description = sentences.slice(0, 3).join('. ').substring(0, 400);
  }
  
  return {
    title: title,
    description: description || 'Description not available',
    category,
    location: criteria.destination,
    rating,
    priceRange,
    address,
    hours,
    contact,
    imageUrl: undefined // Could be extracted from page content if needed
  };
}

function extractSourceFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    if (hostname.includes('tripadvisor.com')) return 'TripAdvisor';
    if (hostname.includes('booking.com')) return 'Booking.com';
    if (hostname.includes('airbnb.com')) return 'Airbnb';
    if (hostname.includes('expedia.com')) return 'Expedia';
    if (hostname.includes('hotels.com')) return 'Hotels.com';
    if (hostname.includes('yelp.com')) return 'Yelp';
    if (hostname.includes('timeout.com')) return 'Time Out';
    if (hostname.includes('lonelyplanet.com')) return 'Lonely Planet';
    if (hostname.includes('fodors.com')) return 'Fodors';
    if (hostname.includes('frommers.com')) return 'Frommers';
    if (hostname.includes('viator.com')) return 'Viator';
    if (hostname.includes('getyourguide.com')) return 'GetYourGuide';
    if (hostname.includes('klook.com')) return 'Klook';
    if (hostname.includes('opentable.com')) return 'OpenTable';
    if (hostname.includes('kayak.com')) return 'Kayak';
    if (hostname.includes('skyscanner.com')) return 'Skyscanner';
    
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Unknown Source';
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}