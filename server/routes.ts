import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchTravelInfoWithExa, type ProcessedTravelInfo } from "./services/exa";
import { 
  conversationSchema, 
  tripPlanningConversationState,
  insertTripSchema,
  tripPlanningSchema,
  type TripPlanningConversationState,
  type TripPlanningFilters 
} from "@shared/schema";
import { 
  generateTripPlanningResponse, 
  extractTripPlanningCriteria, 
  craftSuperPrompt,
  generateTripItinerary
} from "./services/openai";
import { z } from "zod";

const superPromptSchema = z.object({
  prompt: z.string().min(1, "Please provide a prompt to enhance"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Craft Super Prompt endpoint
  app.post("/api/craft-super-prompt", async (req, res) => {
    try {
      const { prompt } = superPromptSchema.parse(req.body);
      
      const enhancedPrompt = await craftSuperPrompt(prompt);
      
      res.json({
        success: true,
        enhancedPrompt
      });
    } catch (error) {
      console.error("Super prompt crafting error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to craft super prompt"
      });
    }
  });

  // Trip planning chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationId } = conversationSchema.parse(req.body);
      
      let conversation: TripPlanningConversationState;
      
      if (conversationId) {
        const existing = await storage.getTripPlanningConversation(conversationId);
        if (!existing) {
          return res.status(404).json({
            success: false,
            error: "Conversation not found"
          });
        }
        conversation = existing;
      } else {
        // New conversation - extract initial criteria
        const extraction = await extractTripPlanningCriteria(message);
        
        conversation = {
          id: `trip_planning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          currentStep: 'initial_query',
          originalQuery: message,
          extractedCriteria: extraction.criteria,
          pendingQuestions: extraction.missingInfo,
          conversationHistory: [],
          generatedTrip: undefined
        };
      }

      // Update conversation history
      const conversationHistory = conversation.conversationHistory || [];
      conversationHistory.push({ role: 'user', content: message });

      // If this is a follow-up message, extract additional criteria
      if (conversationId) {
        const newExtraction = await extractTripPlanningCriteria(message);
        // Merge new criteria with existing (only add non-empty values)
        Object.entries(newExtraction.criteria).forEach(([key, value]) => {
          if (value && value !== '') {
            (conversation.extractedCriteria as any)[key] = value;
          }
        });
      }

      // NEVER generate trip on first 3 messages - always ask follow-up questions first
      const messageCount = conversationHistory.length;
      const shouldNeverGenerateYet = messageCount <= 6; // At least 3 back-and-forth exchanges
      
      // Check if we have comprehensive information
      const hasDestination = !!(conversation.extractedCriteria.destination && conversation.extractedCriteria.destination.trim().length > 0);
      const hasDates = !!(conversation.extractedCriteria.startDate || conversation.extractedCriteria.duration);
      const hasBudget = !!(conversation.extractedCriteria.budget);
      const hasTravelers = !!(conversation.extractedCriteria.travelers);
      const hasStyle = !!(conversation.extractedCriteria.travelStyle);
      
      // Count how many criteria we have
      const criteriaCount = [hasDestination, hasDates, hasBudget, hasTravelers, hasStyle].filter(Boolean).length;
      
      // Only generate trip if we have comprehensive info AND enough conversation history
      const shouldGenerateTrip = !shouldNeverGenerateYet && hasDestination && hasDates && criteriaCount >= 4;
      
      let generatedTrip: any = undefined;
      
      if (shouldGenerateTrip) {
        try {
          console.log('Generating trip with criteria:', conversation.extractedCriteria);
          
          // Search for travel information with Exa.ai
          const travelInfo = await searchTravelInfoWithExa(conversation.extractedCriteria);
          console.log(`Found ${travelInfo.length} travel items from Exa.ai`);
          
          // Generate comprehensive itinerary
          generatedTrip = await generateTripItinerary(conversation.extractedCriteria, travelInfo);
          
          console.log('Generated trip itinerary successfully');
          
          conversation.generatedTrip = generatedTrip;
          conversation.currentStep = 'showing_results';
        } catch (generationError) {
          console.error('Error generating trip:', generationError);
          conversation.currentStep = 'gathering_requirements';
        }
      } else {
        // Still gathering requirements
        conversation.currentStep = 'gathering_requirements';
      }

      // Generate AI response
      const aiResponse = await generateTripPlanningResponse(
        conversationHistory,
        message,
        conversation.extractedCriteria,
        generatedTrip,
        messageCount
      );

      // Update conversation
      conversationHistory.push({ role: 'assistant', content: aiResponse.response });
      conversation.conversationHistory = conversationHistory;

      await storage.saveTripPlanningConversation(conversation);

      res.json({
        success: true,
        response: aiResponse.response,
        conversationId: conversation.id,
        generatedTrip: shouldGenerateTrip && generatedTrip ? generatedTrip : undefined
      });
    } catch (error) {
      console.error("Trip planning chat error:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to process message"
      });
    }
  });

  // Trip management endpoints
  app.post("/api/trips", async (req, res) => {
    try {
      const tripData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(tripData);
      
      res.json({
        success: true,
        trip
      });
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create trip"
      });
    }
  });

  app.get("/api/trips", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      let trips;
      if (userId) {
        trips = await storage.getUserTrips(userId);
      } else {
        // For demo purposes, return sample trips
        trips = [
          await storage.getTrip(1),
          await storage.getTrip(2)
        ].filter(Boolean);
      }
      
      res.json({
        success: true,
        trips
      });
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch trips"
      });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTrip(parseInt(req.params.id));
      
      if (!trip) {
        return res.status(404).json({
          success: false,
          error: "Trip not found"
        });
      }

      res.json({
        success: true,
        trip
      });
    } catch (error) {
      console.error("Error fetching trip:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch trip"
      });
    }
  });

  app.put("/api/trips/:id", async (req, res) => {
    try {
      const updates = req.body;
      const trip = await storage.updateTrip(parseInt(req.params.id), updates);
      
      if (!trip) {
        return res.status(404).json({
          success: false,
          error: "Trip not found"
        });
      }

      res.json({
        success: true,
        trip
      });
    } catch (error) {
      console.error("Error updating trip:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update trip"
      });
    }
  });

  app.delete("/api/trips/:id", async (req, res) => {
    try {
      const success = await storage.deleteTrip(parseInt(req.params.id));
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Trip not found"
        });
      }

      res.json({
        success: true,
        message: "Trip deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting trip:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete trip"
      });
    }
  });

  // Get conversation history
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getTripPlanningConversation(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found"
        });
      }

      res.json({
        success: true,
        conversation
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch conversation"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}