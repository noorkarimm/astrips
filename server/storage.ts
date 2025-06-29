import { 
  users, 
  trips, 
  userPreferences,
  tripSearches,
  type User, 
  type InsertUser, 
  type Trip,
  type InsertTrip,
  type UserPreference,
  type TripSearch,
  type TripPlanningConversationState,
  type TripPlanningFilters
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trip methods
  getTrip(id: number): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  getUserTrips(userId: number): Promise<Trip[]>;
  updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  
  // User preferences
  getUserPreferences(userId: number): Promise<UserPreference[]>;
  saveUserPreference(preference: Omit<UserPreference, 'id' | 'createdAt'>): Promise<UserPreference>;
  
  // Trip planning conversation methods
  getTripPlanningConversation(id: string): Promise<TripPlanningConversationState | undefined>;
  saveTripPlanningConversation(conversation: TripPlanningConversationState): Promise<TripPlanningConversationState>;
  
  // Trip search history
  saveTripSearch(search: Omit<TripSearch, 'id' | 'createdAt'>): Promise<TripSearch>;
  getUserTripSearches(userId: number): Promise<TripSearch[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private userPreferences: Map<number, UserPreference>;
  private tripSearches: Map<number, TripSearch>;
  private tripPlanningConversations: Map<string, TripPlanningConversationState>;
  private currentUserId: number;
  private currentTripId: number;
  private currentPreferenceId: number;
  private currentTripSearchId: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.userPreferences = new Map();
    this.tripSearches = new Map();
    this.tripPlanningConversations = new Map();
    this.currentUserId = 1;
    this.currentTripId = 1;
    this.currentPreferenceId = 1;
    this.currentTripSearchId = 1;
    
    // Seed with sample data
    this.seedSampleData();
  }

  private async seedSampleData() {
    // Sample trips
    await this.createTrip({
      userId: null,
      title: "Romantic Weekend in Paris",
      destination: "Paris, France",
      startDate: new Date('2024-02-14'),
      endDate: new Date('2024-02-16'),
      budget: "1500",
      currency: "USD",
      travelers: 2,
      travelStyle: "romantic",
      preferences: {
        accommodationType: ["boutique", "luxury"],
        activities: ["culture", "food", "art"],
        transportation: ["flight"],
        dietaryRestrictions: [],
        accessibility: []
      },
      itinerary: {
        days: [
          {
            date: "2024-02-14",
            activities: [
              {
                time: "10:00",
                title: "Arrival at Charles de Gaulle Airport",
                description: "Land in Paris and take taxi to hotel",
                location: "Charles de Gaulle Airport",
                category: "transport",
                cost: 60,
                duration: "1 hour"
              },
              {
                time: "14:00",
                title: "Check-in at Hotel des Grands Boulevards",
                description: "Boutique hotel in the heart of Paris",
                location: "17 Boulevard Poissonnière, 75002 Paris",
                category: "accommodation",
                cost: 250,
                duration: "30 minutes",
                rating: 4.5
              },
              {
                time: "16:00",
                title: "Seine River Cruise",
                description: "Romantic boat ride along the Seine with champagne",
                location: "Port de la Bourdonnais",
                category: "activity",
                cost: 45,
                duration: "1.5 hours",
                rating: 4.3
              },
              {
                time: "19:30",
                title: "Dinner at L'Ami Jean",
                description: "Traditional French bistro with excellent wine selection",
                location: "27 Rue Malar, 75007 Paris",
                category: "food",
                cost: 120,
                duration: "2 hours",
                rating: 4.6
              }
            ]
          },
          {
            date: "2024-02-15",
            activities: [
              {
                time: "09:00",
                title: "Visit to the Louvre Museum",
                description: "Explore world-famous art collection including Mona Lisa",
                location: "Rue de Rivoli, 75001 Paris",
                category: "activity",
                cost: 17,
                duration: "3 hours",
                rating: 4.7
              },
              {
                time: "13:00",
                title: "Lunch at Café de Flore",
                description: "Historic café in Saint-Germain-des-Prés",
                location: "172 Boulevard Saint-Germain, 75006 Paris",
                category: "food",
                cost: 65,
                duration: "1.5 hours",
                rating: 4.2
              },
              {
                time: "15:30",
                title: "Stroll through Montmartre",
                description: "Explore artistic neighborhood and visit Sacré-Cœur",
                location: "Montmartre, 75018 Paris",
                category: "activity",
                cost: 0,
                duration: "2.5 hours",
                rating: 4.8
              },
              {
                time: "20:00",
                title: "Dinner at Le Jules Verne",
                description: "Michelin-starred restaurant in the Eiffel Tower",
                location: "Eiffel Tower, 75007 Paris",
                category: "food",
                cost: 290,
                duration: "2.5 hours",
                rating: 4.4
              }
            ]
          }
        ],
        totalCost: 847,
        accommodations: [
          {
            name: "Hotel des Grands Boulevards",
            type: "boutique",
            location: "17 Boulevard Poissonnière, 75002 Paris",
            checkIn: "2024-02-14",
            checkOut: "2024-02-16",
            cost: 500,
            rating: 4.5,
            amenities: ["WiFi", "Restaurant", "Bar", "Concierge"],
            bookingUrl: "https://booking.com/hotel-des-grands-boulevards"
          }
        ],
        transportation: [
          {
            type: "flight",
            from: "New York JFK",
            to: "Paris CDG",
            date: "2024-02-14",
            time: "08:00",
            cost: 650,
            duration: "7 hours",
            bookingUrl: "https://kayak.com/flights"
          }
        ]
      },
      status: "draft"
    });

    await this.createTrip({
      userId: null,
      title: "Adventure Week in Costa Rica",
      destination: "Costa Rica",
      startDate: new Date('2024-03-10'),
      endDate: new Date('2024-03-17'),
      budget: "2200",
      currency: "USD",
      travelers: 4,
      travelStyle: "adventure",
      preferences: {
        accommodationType: ["eco-lodge", "hotel"],
        activities: ["adventure", "nature", "wildlife"],
        transportation: ["flight", "car"],
        dietaryRestrictions: [],
        accessibility: []
      },
      itinerary: {
        days: [
          {
            date: "2024-03-10",
            activities: [
              {
                time: "11:00",
                title: "Arrival in San José",
                description: "Land at Juan Santamaría International Airport",
                location: "San José, Costa Rica",
                category: "transport",
                cost: 80,
                duration: "1 hour"
              },
              {
                time: "15:00",
                title: "Check-in at Hotel Presidente",
                description: "Historic hotel in downtown San José",
                location: "Avenida Central, San José",
                category: "accommodation",
                cost: 120,
                duration: "30 minutes",
                rating: 4.1
              },
              {
                time: "17:00",
                title: "Explore Central Market",
                description: "Local market with crafts, coffee, and food",
                location: "Mercado Central, San José",
                category: "activity",
                cost: 20,
                duration: "2 hours",
                rating: 4.3
              }
            ]
          }
        ],
        totalCost: 2200
      },
      status: "draft"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Trip methods
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.currentTripId++;
    const trip: Trip = { 
      ...insertTrip, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.trips.set(id, trip);
    return trip;
  }

  async getUserTrips(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(trip => trip.userId === userId);
  }

  async updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    
    const updatedTrip = { 
      ...trip, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }

  async deleteTrip(id: number): Promise<boolean> {
    return this.trips.delete(id);
  }

  // User preferences
  async getUserPreferences(userId: number): Promise<UserPreference[]> {
    return Array.from(this.userPreferences.values()).filter(pref => pref.userId === userId);
  }

  async saveUserPreference(preference: Omit<UserPreference, 'id' | 'createdAt'>): Promise<UserPreference> {
    const id = this.currentPreferenceId++;
    const userPreference: UserPreference = {
      ...preference,
      id,
      createdAt: new Date()
    };
    this.userPreferences.set(id, userPreference);
    return userPreference;
  }

  // Trip planning conversation methods
  async getTripPlanningConversation(id: string): Promise<TripPlanningConversationState | undefined> {
    return this.tripPlanningConversations.get(id);
  }

  async saveTripPlanningConversation(conversation: TripPlanningConversationState): Promise<TripPlanningConversationState> {
    this.tripPlanningConversations.set(conversation.id, conversation);
    return conversation;
  }

  // Trip search history
  async saveTripSearch(search: Omit<TripSearch, 'id' | 'createdAt'>): Promise<TripSearch> {
    const id = this.currentTripSearchId++;
    const tripSearch: TripSearch = {
      ...search,
      id,
      createdAt: new Date()
    };
    this.tripSearches.set(id, tripSearch);
    return tripSearch;
  }

  async getUserTripSearches(userId: number): Promise<TripSearch[]> {
    return Array.from(this.tripSearches.values()).filter(search => search.userId === userId);
  }
}

export const storage = new MemStorage();