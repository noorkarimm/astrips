import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { AnimatedGradient } from "@/components/ui/animated-gradient";
import { apiRequest } from "@/lib/queryClient";
import { User, MapPin, Clock, DollarSign, Calendar, Users, Plane, Hotel, Utensils, Camera, ExternalLink } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SignedIn, SignedOut, SignInButton, UserButton, useClerk } from '@clerk/clerk-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TripItinerary {
  title: string;
  summary: string;
  days: Array<{
    date: string;
    dayNumber: number;
    theme: string;
    activities: Array<{
      time: string;
      title: string;
      description: string;
      location: string;
      category: 'accommodation' | 'food' | 'activity' | 'transport';
      duration: string;
      cost: number;
      address?: string;
      rating?: number;
      bookingUrl?: string;
      tips?: string;
    }>;
  }>;
  totalEstimatedCost: number;
  packingTips: string[];
  localTips: string[];
  budgetBreakdown: {
    accommodation: number;
    food: number;
    activities: number;
    transportation: number;
  };
}

function TypingIndicator() {
  return (
    <div className="flex items-start space-x-3 mb-6">
      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 border border-white/30">
        <Logo className="text-white" size={16} />
      </div>
      <div className="flex items-center space-x-3 bg-white/20 px-4 py-3 rounded-2xl rounded-tl-md border border-white/30 shadow-lg">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: TripItinerary['days'][0]['activities'][0] }) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'accommodation': return <Hotel className="w-5 h-5" />;
      case 'food': return <Utensils className="w-5 h-5" />;
      case 'activity': return <Camera className="w-5 h-5" />;
      case 'transport': return <Plane className="w-5 h-5" />;
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'accommodation': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'food': return 'bg-green-100 text-green-800 border-green-200';
      case 'activity': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'transport': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white/90 border border-white/30 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:bg-white/95">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className={`p-2 rounded-lg ${getCategoryColor(activity.category)}`}>
            {getCategoryIcon(activity.category)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-lg font-bold text-gray-900 leading-tight">{activity.title}</h4>
            <p className="text-gray-600 text-sm">{activity.location}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1 flex-shrink-0">
          <span className="text-sm font-medium text-gray-900">{activity.time}</span>
          <span className="text-xs text-gray-500">{activity.duration}</span>
        </div>
      </div>

      <p className="text-gray-700 text-sm leading-relaxed mb-3">
        {activity.description}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {activity.cost > 0 && (
          <div className="flex items-center space-x-2 text-gray-700">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">${activity.cost}</span>
          </div>
        )}
        {activity.rating && (
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-sm">⭐ {activity.rating}/5</span>
          </div>
        )}
      </div>

      {activity.tips && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-xs font-medium">💡 Tip: {activity.tips}</p>
        </div>
      )}

      {activity.bookingUrl && (
        <div className="flex justify-end">
          <a
            href={activity.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <span>Book Now</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

function TripItineraryDisplay({ itinerary }: { itinerary: TripItinerary }) {
  return (
    <div className="mt-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">{itinerary.title}</h2>
        <p className="text-white/80 text-lg">{itinerary.summary}</p>
      </div>

      {/* Budget Overview */}
      <div className="mb-6 bg-white/90 border border-white/30 rounded-lg p-4 shadow-md backdrop-blur-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Trip Budget Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${itinerary.budgetBreakdown.accommodation}</div>
            <div className="text-sm text-gray-600">Accommodation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${itinerary.budgetBreakdown.food}</div>
            <div className="text-sm text-gray-600">Food & Dining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">${itinerary.budgetBreakdown.activities}</div>
            <div className="text-sm text-gray-600">Activities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">${itinerary.budgetBreakdown.transportation}</div>
            <div className="text-sm text-gray-600">Transportation</div>
          </div>
        </div>
        <div className="text-center pt-4 border-t border-gray-200">
          <div className="text-3xl font-bold text-gray-900">${itinerary.totalEstimatedCost}</div>
          <div className="text-sm text-gray-600">Total Estimated Cost</div>
        </div>
      </div>

      {/* Daily Itinerary */}
      <div className="space-y-6">
        {itinerary.days.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-white/80 border border-white/40 rounded-lg p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Day {day.dayNumber}</h3>
                <p className="text-gray-600">{new Date(day.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {day.theme}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {day.activities.map((activity, activityIndex) => (
                <ActivityCard key={activityIndex} activity={activity} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tips and Recommendations */}
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        {itinerary.packingTips && itinerary.packingTips.length > 0 && (
          <div className="bg-white/90 border border-white/30 rounded-lg p-4 shadow-md backdrop-blur-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">🎒 Packing Tips</h3>
            <ul className="space-y-2">
              {itinerary.packingTips.map((tip, index) => (
                <li key={index} className="text-gray-700 text-sm flex items-start">
                  <span className="text-primary mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {itinerary.localTips && itinerary.localTips.length > 0 && (
          <div className="bg-white/90 border border-white/30 rounded-lg p-4 shadow-md backdrop-blur-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">🌍 Local Tips</h3>
            <ul className="space-y-2">
              {itinerary.localTips.map((tip, index) => (
                <li key={index} className="text-gray-700 text-sm flex items-start">
                  <span className="text-primary mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatMessages({ messages, generatedTrip }: { messages: ChatMessage[], generatedTrip?: TripItinerary }) {
  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div key={index} className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
            message.role === 'user' 
              ? 'bg-primary/30 border-primary/40' 
              : 'bg-white/20 border-white/30'
          }`}>
            {message.role === 'user' ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Logo className="text-white" size={16} />
            )}
          </div>
          <div className={`max-w-[85%] p-4 rounded-2xl border shadow-lg backdrop-blur-sm ${
            message.role === 'user' 
              ? 'bg-primary/20 text-white rounded-tr-md border-primary/30' 
              : 'bg-white/15 text-white rounded-tl-md border-white/25'
          }`}>
            {message.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none prose-headings:text-white prose-p:text-white prose-strong:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white prose-blockquote:text-white prose-code:text-white prose-pre:text-white">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({children}) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                    h2: ({children}) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
                    h3: ({children}) => <h3 className="text-sm font-bold text-white mb-1">{children}</h3>,
                    h4: ({children}) => <h4 className="text-sm font-semibold text-white mb-1">{children}</h4>,
                    p: ({children}) => <p className="text-sm text-white mb-2 leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="text-sm text-white mb-2 ml-4 list-disc">{children}</ul>,
                    ol: ({children}) => <ol className="text-sm text-white mb-2 ml-4 list-decimal">{children}</ol>,
                    li: ({children}) => <li className="text-white mb-1">{children}</li>,
                    strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                    em: ({children}) => <em className="italic text-white">{children}</em>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-white/20 pl-4 italic text-white">{children}</blockquote>,
                    code: ({children}) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs text-white font-mono">{children}</code>,
                    pre: ({children}) => <pre className="bg-white/10 p-3 rounded text-xs text-white font-mono overflow-x-auto">{children}</pre>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{message.content}</p>
            )}
            <span className="text-xs opacity-70 mt-2 block">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
      
      {/* Show trip itinerary if available */}
      {generatedTrip && (
        <TripItineraryDisplay itinerary={generatedTrip} />
      )}
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [generatedTrip, setGeneratedTrip] = useState<TripItinerary | undefined>();
  const { openSignIn } = useClerk();

  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; conversationId?: string }) => {
      const response = await apiRequest("POST", "/api/chat", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response,
          timestamp: new Date()
        }]);
        setConversationId(data.conversationId);
        
        // Update generated trip if provided
        if (data.generatedTrip) {
          setGeneratedTrip(data.generatedTrip);
        }
      }
    },
  });

  const handleSend = (message: string, files?: File[]) => {
    if (message.trim().length === 0) return;
    
    // Extract the actual message from special formats
    let actualMessage = message;
    
    if (message.startsWith('[Search: ') && message.endsWith(']')) {
      actualMessage = message.slice(9, -1);
    } else if (message.startsWith('[Think: ') && message.endsWith(']')) {
      actualMessage = message.slice(8, -1);
    } else if (message.startsWith('[Canvas: ') && message.endsWith(']')) {
      actualMessage = message.slice(9, -1);
    }
    
    // Add user message immediately
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: actualMessage,
      timestamp: new Date()
    }]);
    
    // Send to AI
    chatMutation.mutate({
      message: actualMessage,
      conversationId: conversationId || undefined
    });
  };

  const handleExampleClick = (exampleText: string) => {
    handleSend(exampleText);
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setGeneratedTrip(undefined);
  };

  const returnToLanding = () => {
    setMessages([]);
    setConversationId(null);
    setGeneratedTrip(undefined);
  };

  const handleSignInClick = () => {
    openSignIn({
      appearance: {
        variables: {
          colorPrimary: "#e11d48",
          colorBackground: "#ffffff",
          colorText: "#1f2937",
          borderRadius: "0.5rem"
        },
        elements: {
          formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
          card: "shadow-lg border border-gray-200",
          headerTitle: "text-xl font-bold text-gray-900",
          headerSubtitle: "text-gray-600",
          socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50",
          formFieldInput: "border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary",
          footerActionLink: "text-primary hover:text-primary/80"
        }
      }
    });
  };

  const isLoading = chatMutation.isPending;
  const error = chatMutation.error;

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Animated Gradient Background */}
      <AnimatedGradient />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="relative z-50 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button 
                onClick={returnToLanding}
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <Logo className="text-white" size={20} />
              </button>
              
              <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
                <h1 className="text-xl font-bold text-white">atrips</h1>
                <p className="text-[10px] text-white/70">AI Travel Planner</p>
              </div>
              
              <div className="flex items-center space-x-4">
                {messages.length > 0 && (
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-white/10 font-medium border border-white/20"
                    onClick={clearChat}
                  >
                    New Trip
                  </Button>
                )}
                
                {/* Clerk Authentication */}
                <SignedOut>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-white/10 font-medium border border-white/20"
                    onClick={handleSignInClick}
                  >
                    Sign In
                  </Button>
                </SignedOut>
                <SignedIn>
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 border-2 border-white/30",
                        userButtonPopoverCard: "bg-white shadow-lg border border-gray-200",
                        userButtonPopoverActionButton: "hover:bg-gray-100 text-gray-700",
                        userButtonPopoverActionButtonText: "text-gray-700",
                        userButtonPopoverFooter: "hidden"
                      }
                    }}
                  />
                </SignedIn>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Plan Your Perfect Trip</h2>
                <p className="text-lg text-white/90 max-w-2xl">
                  Tell me about your dream vacation and I'll create a personalized itinerary with real recommendations from across the web.
                </p>
              </div>

              {/* AI Prompt Input */}
              <div className="w-full max-w-2xl relative mb-8">
                <PromptInputBox
                  onSend={handleSend}
                  isLoading={isLoading}
                  placeholder="Describe your ideal trip... (e.g., romantic weekend in Paris, adventure week in Costa Rica)"
                  className="bg-white/90 border-white/30 shadow-lg backdrop-blur-sm"
                />
                
                {error && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-300/30 rounded-lg backdrop-blur-sm">
                    <p className="text-white text-sm">
                      {error instanceof Error ? error.message : "An error occurred"}
                    </p>
                  </div>
                )}
              </div>

              {/* Example prompts - Two rows with two components each */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                {/* First Row */}
                <button
                  onClick={() => handleExampleClick("I want a food-focused weekend in Chicago with my spouse")}
                  className="bg-white/20 border border-white/30 rounded-lg p-4 text-left hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <h3 className="font-medium text-white mb-2 text-sm">🍝 Food Weekend</h3>
                  <p className="text-xs text-white/70">Chicago with spouse</p>
                </button>
                <button
                  onClick={() => handleExampleClick("Need a family-friendly beach vacation under $3K")}
                  className="bg-white/20 border border-white/30 rounded-lg p-4 text-left hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <h3 className="font-medium text-white mb-2 text-sm">🏖️ Beach Vacation</h3>
                  <p className="text-xs text-white/70">Family under $3K</p>
                </button>
                
                {/* Second Row */}
                <button
                  onClick={() => handleExampleClick("Plan a 5-day adventure trip to Costa Rica for 2 people")}
                  className="bg-white/20 border border-white/30 rounded-lg p-4 text-left hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <h3 className="font-medium text-white mb-2 text-sm">🏔️ Adventure Trip</h3>
                  <p className="text-xs text-white/70">5-day Costa Rica</p>
                </button>
                <button
                  onClick={() => handleExampleClick("Looking for a cultural trip to Japan, interested in art and history")}
                  className="bg-white/20 border border-white/30 rounded-lg p-4 text-left hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <h3 className="font-medium text-white mb-2 text-sm">🎨 Cultural Trip</h3>
                  <p className="text-xs text-white/70">Japan art & history</p>
                </button>
              </div>
            </div>
          ) : (
            /* Chat Interface */
            <>
              {/* Messages Area with generous bottom padding for fixed input */}
              <div className="flex-1 overflow-y-auto px-4 py-8 pb-40">
                <div className="max-w-4xl mx-auto">
                  <ChatMessages messages={messages} generatedTrip={generatedTrip} />
                  {isLoading && <TypingIndicator />}
                  
                  {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-300/30 rounded-lg backdrop-blur-sm">
                      <p className="text-white text-sm">
                        {error instanceof Error ? error.message : "An error occurred"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Input Area at Bottom */}
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/40 via-black/20 to-transparent backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-4 py-6">
                  <PromptInputBox
                    onSend={handleSend}
                    isLoading={isLoading}
                    placeholder="Ask for changes, more details, or plan another trip..."
                    className="bg-white/90 border-white/30 shadow-xl backdrop-blur-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}