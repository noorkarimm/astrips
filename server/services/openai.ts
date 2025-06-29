import OpenAI from "openai";
import { storage } from "../storage";
import { searchTravelInfoWithExa, type ProcessedTravelInfo } from "./exa";
import type { TripPlanningFilters, Trip } from "@shared/schema";

// Load environment variables
import { config } from 'dotenv';
config();

// Validate API key exists
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
  console.error('OPENAI_API_KEY is not set or is using the placeholder value. Please set a valid OpenAI API key in your .env file.');
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function craftSuperPrompt(userPrompt: string): Promise<string> {
  try {
    // Check if API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    const systemPrompt = `You are an expert prompt engineer specializing in creating highly effective, structured prompts that minimize hallucination and maximize accuracy. Your task is to transform user prompts into comprehensive, systematic prompts using the following template structure:

"You are [ROLE] specializing in [DOMAIN/EXPERTISE]. Your responses must be accurate and minimize hallucination through systematic verification.

Context: [USER'S TASK/SITUATION]
Objective: [MAIN GOAL]

Instructions:
1. Decompose complex requests into subtasks
2. Verify information and cross-reference sources
3. Handle uncertainty explicitly with disclaimers
4. Engage domain experts when needed
5. Synthesize verified solutions

Constraints: [LIMITATIONS]
Format: [STRUCTURE]
Success: [CRITERIA]"

Guidelines for crafting the super prompt:
1. Analyze the user's original prompt to identify the domain, role, and objective
2. Fill in each section thoughtfully based on the user's request
3. Make the role specific and relevant to the task
4. Define clear, measurable success criteria
5. Include relevant constraints and formatting requirements
6. Ensure the enhanced prompt will produce more accurate, structured responses

Transform the user's prompt into this structured format, making it more comprehensive and effective.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Transform this prompt into a super prompt: "${userPrompt}"` }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    return response.choices[0].message.content || "Failed to generate enhanced prompt";
  } catch (error) {
    console.error("Error crafting super prompt:", error);
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error("OpenAI API key is not configured properly. Please check your .env file.");
    }
    throw new Error("Failed to craft super prompt. Please try again.");
  }
}

function cleanJsonResponse(content: string): string {
  // Remove markdown code block delimiters
  return content
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export async function extractTripPlanningCriteria(userMessage: string): Promise<{
  criteria: TripPlanningFilters;
  confidence: number;
  missingInfo: string[];
}> {
  try {
    // Check if API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    const systemPrompt = `You are an AI travel planning assistant. Extract travel planning criteria from user messages and identify what information might be missing.

Available travel styles: "luxury", "budget", "adventure", "family", "romantic", "business", "cultural", "relaxation"
Available activities: "food", "culture", "adventure", "relaxation", "nightlife", "shopping", "nature", "history", "art", "sports"
Available accommodation types: "hotel", "airbnb", "resort", "hostel", "boutique", "luxury"

Extract the following information from the user's message:
- destination: Where they want to travel
- startDate: When they want to start (YYYY-MM-DD format if specific)
- endDate: When they want to end (YYYY-MM-DD format if specific)
- budget: Total budget amount (number only)
- travelers: Number of people traveling
- travelStyle: Style of travel
- activities: Array of activities they're interested in
- accommodationType: Type of accommodation preferred
- duration: Number of days (if mentioned)

Return a JSON object with:
{
  "criteria": { extracted criteria object },
  "confidence": number between 0-1,
  "missingInfo": ["list of important missing information"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const rawContent = response.choices[0].message.content || "{}";
    const cleanedContent = cleanJsonResponse(rawContent);
    const result = JSON.parse(cleanedContent);
    
    return {
      criteria: result.criteria || {},
      confidence: result.confidence || 0,
      missingInfo: result.missingInfo || []
    };
  } catch (error) {
    console.error("Error extracting trip planning criteria:", error);
    if (error instanceof Error && error.message.includes('API key')) {
      return {
        criteria: {},
        confidence: 0,
        missingInfo: ["OpenAI API key is not configured properly. Please check your .env file."]
      };
    }
    return {
      criteria: {},
      confidence: 0,
      missingInfo: ["Unable to parse trip planning criteria"]
    };
  }
}

export async function generateTripItinerary(
  criteria: TripPlanningFilters,
  travelInfo: ProcessedTravelInfo[]
): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    const systemPrompt = `You are an expert travel planner. Create a detailed, personalized itinerary based on the user's criteria and available travel information.

Create a comprehensive itinerary that includes:
1. Day-by-day schedule with specific times
2. Mix of accommodations, restaurants, activities, and transportation
3. Realistic timing and logistics
4. Budget considerations
5. Local insights and tips

Use the provided travel information to make specific recommendations with real places, restaurants, and activities.

Return a JSON object with this structure:
{
  "title": "Trip title",
  "summary": "Brief trip overview",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayNumber": 1,
      "theme": "Day theme (e.g., 'Arrival & City Center')",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Detailed description",
          "location": "Specific location",
          "category": "accommodation|food|activity|transport",
          "duration": "2 hours",
          "cost": 50,
          "address": "Full address",
          "rating": 4.5,
          "bookingUrl": "URL if available",
          "tips": "Local tips or notes"
        }
      ]
    }
  ],
  "totalEstimatedCost": 1500,
  "packingTips": ["Essential items to pack"],
  "localTips": ["Important local information"],
  "budgetBreakdown": {
    "accommodation": 600,
    "food": 400,
    "activities": 300,
    "transportation": 200
  }
}`;

    const userPrompt = `Create a ${criteria.duration || 3}-day itinerary for ${criteria.destination} with these preferences:
- Budget: $${criteria.budget || 'flexible'}
- Travelers: ${criteria.travelers || 1}
- Style: ${criteria.travelStyle || 'balanced'}
- Interests: ${criteria.activities?.join(', ') || 'general sightseeing'}
- Accommodation: ${criteria.accommodationType || 'hotel'}

Available travel information:
${travelInfo.map(info => `
- ${info.title} (${info.category})
  Location: ${info.location}
  Rating: ${info.rating || 'N/A'}
  Price: ${info.priceRange || 'N/A'}
  Description: ${info.description}
  URL: ${info.url}
`).join('\n')}

Create a realistic, engaging itinerary that maximizes the travel experience while staying within budget and preferences.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const rawContent = response.choices[0].message.content || "{}";
    const cleanedContent = cleanJsonResponse(rawContent);
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error("Error generating trip itinerary:", error);
    throw new Error("Failed to generate trip itinerary. Please try again.");
  }
}

export async function generateTripPlanningResponse(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  currentCriteria: TripPlanningFilters,
  generatedTrip?: any,
  messageCount?: number
): Promise<{
  response: string;
  needsMoreInfo: boolean;
  suggestedQuestions: string[];
}> {
  try {
    // Check if API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return {
        response: "I'm unable to process your request because the OpenAI API key is not configured properly. Please contact the administrator to set up the API key.",
        needsMoreInfo: true,
        suggestedQuestions: ["Please configure the OpenAI API key to continue."]
      };
    }

    const isEarlyInConversation = (messageCount || conversationHistory.length) <= 6;

    // Determine what's missing and what to ask next
    const hasDestination = !!(currentCriteria.destination && currentCriteria.destination.trim().length > 0);
    const hasDates = !!(currentCriteria.startDate || currentCriteria.duration);
    const hasBudget = !!(currentCriteria.budget);
    const hasTravelers = !!(currentCriteria.travelers);
    const hasStyle = !!(currentCriteria.travelStyle);
    const hasActivities = !!(currentCriteria.activities && currentCriteria.activities.length > 0);

    let systemPrompt = `You are Trips, a helpful AI travel planning assistant. Your role is to ask ONE focused question at a time to understand the user's travel needs.

CRITICAL RULES:
1. **ASK ONLY ONE QUESTION** - Never ask multiple questions in a single response
2. **BE CONVERSATIONAL** - Respond naturally to what the user said, then ask your one question
3. **FOLLOW LOGICAL ORDER** - Ask the most important missing information first
4. **NO EARLY TRIP GENERATION** - Must gather comprehensive info before creating itineraries

Current conversation state:
- Message count: ${messageCount || conversationHistory.length}
- User's latest message: "${userMessage}"
- Information gathered: ${JSON.stringify(currentCriteria, null, 2)}

${isEarlyInConversation ? `
🚫 **DO NOT GENERATE TRIP YET** - Continue gathering information.

Your task: Ask ONE specific follow-up question based on what's missing:

Priority order for questions:
1. If no destination: Ask where they want to travel
2. If no dates/duration: Ask about travel dates or trip length
3. If no travelers: Ask how many people are traveling
4. If no budget: Ask about budget expectations
5. If no travel style: Ask about their travel style/vibe
6. If no activities: Ask about interests and activities

Choose the MOST IMPORTANT missing piece and ask ONE clear question about it.

Example responses:
- "That sounds amazing! Where are you thinking of traveling to?"
- "Perfect! When are you planning to take this trip?"
- "Great! How many people will be traveling?"
- "Excellent! What's your budget range for this trip?"
- "Wonderful! What kind of vibe are you going for - luxury, adventure, relaxation, cultural exploration?"

Be friendly and acknowledge what they said, then ask your ONE question.
` : generatedTrip ? `
✅ **PRESENT TRIP ITINERARY** - You have enough information and generated a complete itinerary.

Present the trip plan clearly and explain why it matches their criteria. Highlight the key features and experiences included.
` : `
🔄 **CONTINUE GATHERING INFO** - Ask ONE more specific question to get the remaining details needed.

Missing information:
${!hasDestination ? '- Destination' : ''}
${!hasDates ? '- Travel dates or duration' : ''}
${!hasTravelers ? '- Number of travelers' : ''}
${!hasBudget ? '- Budget' : ''}
${!hasStyle ? '- Travel style/vibe' : ''}
${!hasActivities ? '- Interests and activities' : ''}

Pick the MOST IMPORTANT missing piece and ask ONE question about it.
`}

RESPONSE STYLE:
- Acknowledge what the user said first
- Ask only ONE clear, specific question
- Be friendly and conversational
- Explain briefly why you're asking if helpful
- Keep it concise and focused`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseText = response.choices[0].message.content || "I'm sorry, I couldn't process your request.";

    // Determine if we need more information
    const needsMoreInfo = isEarlyInConversation || (!generatedTrip);

    const suggestedQuestions = [];
    if (!currentCriteria.destination) {
      suggestedQuestions.push("Where would you like to travel?");
    } else if (!currentCriteria.startDate && !currentCriteria.duration) {
      suggestedQuestions.push("When are you planning to travel?");
    } else if (!currentCriteria.travelers) {
      suggestedQuestions.push("How many people are traveling?");
    } else if (!currentCriteria.budget) {
      suggestedQuestions.push("What's your budget for this trip?");
    } else if (!currentCriteria.travelStyle) {
      suggestedQuestions.push("What kind of travel experience are you looking for?");
    } else if (!currentCriteria.activities || currentCriteria.activities.length === 0) {
      suggestedQuestions.push("What activities interest you most?");
    }

    return {
      response: responseText,
      needsMoreInfo,
      suggestedQuestions
    };
  } catch (error) {
    console.error("Error generating trip planning response:", error);
    if (error instanceof Error && error.message.includes('API key')) {
      return {
        response: "I'm unable to process your request because the OpenAI API key is not configured properly. Please contact the administrator to set up the API key.",
        needsMoreInfo: true,
        suggestedQuestions: ["Please configure the OpenAI API key to continue."]
      };
    }
    return {
      response: "I'm experiencing some technical difficulties. Please try rephrasing your travel request.",
      needsMoreInfo: true,
      suggestedQuestions: ["Where would you like to travel?"]
    };
  }
}