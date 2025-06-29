import { pgTable, text, serial, integer, boolean, jsonb, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  travelers: integer("travelers").default(1),
  travelStyle: text("travel_style"), // "luxury", "budget", "adventure", "family", "romantic", "business"
  preferences: jsonb("preferences").$type<{
    accommodationType?: string[]; // "hotel", "airbnb", "resort", "hostel"
    activities?: string[]; // "food", "culture", "adventure", "relaxation", "nightlife"
    transportation?: string[]; // "flight", "car", "train", "bus"
    dietaryRestrictions?: string[];
    accessibility?: string[];
  }>(),
  itinerary: jsonb("itinerary").$type<{
    days: Array<{
      date: string;
      activities: Array<{
        time: string;
        title: string;
        description: string;
        location: string;
        category: string; // "accommodation", "food", "activity", "transport"
        cost?: number;
        duration?: string;
        bookingUrl?: string;
        address?: string;
        rating?: number;
        imageUrl?: string;
      }>;
    }>;
    totalCost?: number;
    accommodations?: Array<{
      name: string;
      type: string;
      location: string;
      checkIn: string;
      checkOut: string;
      cost: number;
      rating?: number;
      amenities?: string[];
      bookingUrl?: string;
      imageUrl?: string;
    }>;
    transportation?: Array<{
      type: string;
      from: string;
      to: string;
      date: string;
      time: string;
      cost: number;
      duration?: string;
      bookingUrl?: string;
    }>;
  }>(),
  status: text("status").default("draft"), // "draft", "confirmed", "completed"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  preferenceType: text("preference_type").notNull(), // "accommodation", "activity", "food", "transport"
  preferenceValue: text("preference_value").notNull(),
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.0"), // How much user likes this (0-1)
  createdAt: timestamp("created_at").defaultNow(),
});

export const tripSearches = pgTable("trip_searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  searchQuery: text("search_query").notNull(),
  extractedCriteria: jsonb("extracted_criteria").$type<{
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    travelers?: number;
    travelStyle?: string;
    activities?: string[];
    accommodationType?: string;
    duration?: number;
  }>(),
  generatedTripId: integer("generated_trip_id").references(() => trips.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversationSchema = z.object({
  message: z.string().min(1, "Please provide a message"),
  conversationId: z.string().optional(),
});

export const tripPlanningConversationState = z.object({
  id: z.string(),
  currentStep: z.enum(['initial_query', 'gathering_requirements', 'generating_itinerary', 'showing_results', 'completed']),
  originalQuery: z.string(),
  extractedCriteria: z.object({
    destination: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.number().optional(),
    travelers: z.number().optional(),
    travelStyle: z.string().optional(),
    activities: z.array(z.string()).optional(),
    accommodationType: z.string().optional(),
    duration: z.number().optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    accessibility: z.array(z.string()).optional(),
  }),
  pendingQuestions: z.array(z.string()).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })),
  generatedTrip: z.any().optional(), // Will contain the full trip itinerary
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const tripPlanningSchema = z.object({
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  travelers: z.number().optional(),
  travelStyle: z.string().optional(),
  activities: z.array(z.string()).optional(),
  accommodationType: z.string().optional(),
  duration: z.number().optional(),
});

export type ConversationMessage = z.infer<typeof conversationSchema>;
export type TripPlanningConversationState = z.infer<typeof tripPlanningConversationState>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type TripPlanningFilters = z.infer<typeof tripPlanningSchema>;
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type TripSearch = typeof tripSearches.$inferSelect;