/**
 * Auto-categorization engine
 * Single source of truth for all default categories, keywords, icons and colors.
 * Used by: API routes (register, guest), auto-categorize logic, seed script.
 */

export interface CategoryDefinition {
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CATEGORIES  (26 total — 19 expense + 6 income + 1 catch-all)
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [

  // ── EXPENSE ────────────────────────────────────────────────────────────────

  {
    name: "Food & Dining",
    icon: "utensils",
    color: "#f97316",
    keywords: [
      "zomato", "swiggy", "restaurant", "cafe", "coffee", "tea",
      "pizza", "burger", "mcdonalds", "kfc", "dominos", "subway",
      "starbucks", "dunkin", "chaayos", "chai point", "barista",
      "food", "dining", "eatery", "canteen", "dhaba", "biryani",
      "thali", "mess", "tiffin", "lunch", "dinner", "breakfast",
      "snack", "bakery", "sweet shop", "halwai", "juice bar",
      "food court", "cloud kitchen", "meal delivery",
    ],
  },

  {
    name: "Groceries",
    icon: "shopping-cart",
    color: "#16a34a",
    keywords: [
      // Online grocery platforms
      "bigbasket", "blinkit", "zepto", "instamart", "swiggy instamart",
      "jiomart grocery", "grofers", "milkbasket", "dunzo grocery",
      // Supermarkets & retail chains
      "dmart", "reliance fresh", "more supermarket", "nature basket",
      "star bazaar", "spencers", "easy day", "big bazaar grocery",
      "lulu hypermarket", "metro cash",
      // Specialty & farm-fresh
      "handpickd", "country delight", "sid farm", "fresh to home",
      "licious", "tender cuts", "nandu's chicken", "zappfresh",
      "farmley", "the organic world", "organic india", "nature's basket",
      "daily harvest", "milky mist", "amul",
      // General grocery keywords
      "grocery", "groceries", "supermarket", "hypermarket", "kirana",
      "provision store", "fruits vegetables", "sabzi", "sabziwala",
      "weekly groceries", "monthly groceries", "vegetable",
      "dairy", "milk", "eggs", "bread", "rice", "pulses", "atta",
    ],
  },

  {
    name: "Transport",
    icon: "car",
    color: "#3b82f6",
    keywords: [
      "uber", "ola", "rapido", "auto", "taxi", "cab", "rickshaw",
      "metro", "bus", "local train", "train", "irctc", "railway",
      "petrol", "fuel", "diesel", "cng", "hp petrol", "indian oil",
      "bharat petroleum", "parking", "toll", "fastag",
      "indigo", "air india", "spicejet", "goair", "akasa", "vistara",
      "flight", "airfare", "airline", "ticket",
      "redbus", "abhibus", "volvo", "sleeper bus",
      "bike rent", "yulu", "bounce", "vogo",
      "vehicle service", "car wash", "tyre", "motor workshop",
      "driveu", "meru", "savaari",
    ],
  },

  {
    name: "Shopping",
    icon: "shopping-bag",
    color: "#ec4899",
    keywords: [
      "amazon", "flipkart", "snapdeal", "meesho", "jiomart",
      "tata cliq", "croma", "reliance digital", "vijay sales",
      "electronics", "gadget", "mobile", "laptop shop",
      "apple store", "samsung store", "xiaomi", "oneplus",
      "shop", "store", "mall", "purchase", "order",
    ],
  },

  {
    name: "Clothing & Apparel",
    icon: "shirt",
    color: "#d946ef",
    keywords: [
      "myntra", "ajio", "nykaa fashion", "h&m", "zara", "uniqlo",
      "westside", "lifestyle store", "pantaloons", "max fashion",
      "v-mart", "fabindia", "manyavar", "biba", "w brand",
      "puma", "nike", "adidas", "reebok", "decathlon",
      "shirt", "jeans", "kurta", "saree", "dress", "lehenga",
      "shoes", "footwear", "sneakers", "sandals", "heels", "boots",
      "apparel", "clothing", "garment", "fashion",
      "bag", "handbag", "wallet", "watch", "jewellery", "accessories",
      "belt", "sunglasses", "cap", "hat", "scarf",
    ],
  },

  {
    name: "Entertainment",
    icon: "tv",
    color: "#8b5cf6",
    keywords: [
      "netflix", "prime video", "amazon prime", "hotstar", "disney+",
      "jiocinema", "zee5", "sonyliv", "mxplayer", "voot", "alt balaji",
      "spotify", "gaana", "wynk", "jiosaavn", "hungama",
      "youtube premium", "youtube music",
      "cinema", "pvr", "inox", "cinepolis", "miraj", "carnival cinemas",
      "movie", "concert", "event", "show", "theatre", "play",
      "game", "gaming", "steam", "playstation", "xbox", "epic games",
      "bookmyshow", "insider", "paytm insider", "district",
      "escape room", "bowling", "amusement",
    ],
  },

  {
    name: "Health & Fitness",
    icon: "heart",
    color: "#ef4444",
    keywords: [
      "hospital", "clinic", "doctor", "physician", "specialist",
      "medicine", "pharmacy", "medplus", "apollo pharmacy",
      "netmeds", "1mg", "pharmeasy", "tata 1mg", "healthkart",
      "diagnostic", "lab", "blood test", "scan", "x-ray", "mri",
      "dental", "dentist", "optician", "spectacles", "lenses",
      "gym", "cult.fit", "gold's gym", "anytime fitness", "la fitness",
      "fitness", "yoga", "pilates", "zumba", "crossfit",
      "supplement", "protein", "vitamin", "whey", "ayurveda",
      "physiotherapy", "ayush", "health checkup",
    ],
  },

  {
    name: "Personal Care",
    icon: "scissors",
    color: "#f43f5e",
    keywords: [
      "salon", "saloon", "barber", "haircut", "hair spa", "hair color",
      "beauty parlour", "parlour", "spa", "massage", "waxing",
      "threading", "manicure", "pedicure", "facial", "bleach",
      "skincare", "nykaa beauty", "purplle", "sugar cosmetics",
      "lakme", "loreal", "dove", "himalaya", "biotique", "mamaearth",
      "shampoo", "conditioner", "body wash", "moisturiser", "sunscreen",
      "grooming", "trimmer", "razor", "aftershave", "perfume", "deodorant",
      "lipstick", "makeup", "foundation", "eyeshadow", "nail polish",
    ],
  },

  {
    name: "Utilities",
    icon: "zap",
    color: "#eab308",
    keywords: [
      "electricity", "power bill", "bescom", "tata power", "adani electric",
      "msedcl", "torrent power", "cesc", "tneb",
      "water bill", "bwssb", "water tax",
      "gas bill", "piped gas", "mahanagar gas", "indraprastha gas",
      "internet", "broadband", "airtel", "jio", "vodafone", "vi",
      "bsnl", "you broadband", "hathway", "act fibernet", "spectranet",
      "wifi", "recharge", "mobile bill", "postpaid", "prepaid",
      "dth", "tata play", "dish tv", "d2h", "sun direct",
      "maintenance fee", "society charges", "sewage", "municipal",
    ],
  },

  {
    name: "Rent & Housing",
    icon: "home",
    color: "#14b8a6",
    keywords: [
      "rent", "landlord", "house owner", "housing", "maintenance",
      "society", "flat", "apartment", "pg", "hostel", "coliving",
      "stanza living", "oyo life", "nobroker", "housing.com",
      "magicbricks", "99acres", "makaan.com",
      "security deposit", "advance rent", "room rent", "lease",
    ],
  },

  {
    name: "Home & Household",
    icon: "sofa",
    color: "#f59e0b",
    keywords: [
      "pepperfry", "urban ladder", "ikea", "hometown", "nilkamal",
      "furniture", "mattress", "pillow", "bedsheet", "duvet",
      "curtains", "home decor", "kitchen", "cookware", "utensil",
      "appliance", "washing machine", "refrigerator", "microwave",
      "vacuum", "air purifier", "water purifier",
      "cleaning", "housekeeping", "maid", "cook", "helper",
      "plumber", "electrician", "carpenter", "repair", "pest control",
      "paint", "hardware", "urban company",
    ],
  },

  {
    name: "Education",
    icon: "book-open",
    color: "#06b6d4",
    keywords: [
      "udemy", "coursera", "unacademy", "byju", "vedantu",
      "khan academy", "simplilearn", "great learning", "upgrad",
      "school", "college", "university", "tuition", "coaching",
      "fees", "admission", "exam fees", "neet", "jee", "upsc",
      "gmat", "gre", "ielts", "toefl", "sat",
      "book", "textbook", "stationery", "pen", "notebook",
      "course", "workshop", "seminar", "certification", "training",
    ],
  },

  {
    name: "Travel & Vacation",
    icon: "plane",
    color: "#0ea5e9",
    keywords: [
      "makemytrip", "goibibo", "yatra", "cleartrip", "ixigo",
      "ease my trip", "via.com",
      "airbnb", "oyo", "taj hotel", "marriott", "treebo",
      "fabhotels", "hotel", "resort", "hostel stay",
      "booking.com", "trivago", "agoda", "expedia",
      "holiday", "vacation", "trip", "tour", "travel package",
      "visa fees", "passport", "forex", "currency exchange",
      "sightseeing", "museum", "theme park", "waterpark",
      "adventure", "trekking", "safari", "cruise",
      "travel insurance", "luggage",
    ],
  },

  {
    name: "Gifts & Donations",
    icon: "gift",
    color: "#10b981",
    keywords: [
      "gift", "gifting", "present", "wrapping",
      "donation", "donate", "charity", "ngo", "crowdfunding",
      "give india", "ketto", "milaap", "goonj", "cry india",
      "temple", "mandir", "church", "mosque", "masjid",
      "gurudwara", "prasad", "pooja", "offerings",
      "birthday gift", "wedding gift", "anniversary gift",
      "flowers", "bouquet", "card",
    ],
  },

  {
    name: "Insurance",
    icon: "shield",
    color: "#64748b",
    keywords: [
      "lic", "life insurance", "health insurance", "term plan",
      "term insurance", "vehicle insurance", "bike insurance",
      "car insurance", "home insurance", "travel insurance",
      "hdfc life", "max life", "sbi life", "icici prudential",
      "bajaj allianz", "star health", "care health", "niva bupa",
      "tata aig", "new india assurance", "oriental insurance",
      "premium", "policy", "insurance premium", "renewal premium",
    ],
  },

  {
    name: "Kids & Family",
    icon: "baby",
    color: "#38bdf8",
    keywords: [
      "toys", "toy", "lego", "hamleys", "mattel", "fisher price",
      "firstcry", "baby", "diapers", "pampers", "huggies", "mamy poko",
      "formula", "baby food", "cerelac", "nestum",
      "daycare", "creche", "playschool", "nursery",
      "nanny", "babysitter", "kids wear", "school bag",
      "school fees", "admission fees", "tution",
    ],
  },

  {
    name: "Pets",
    icon: "paw-print",
    color: "#84cc16",
    keywords: [
      "vet", "veterinary", "veterinarian", "pet clinic",
      "pet food", "pedigree", "drools", "royal canin", "whiskas",
      "sheba", "purina", "hills science",
      "pet shop", "petco", "heads up for tails", "supertails",
      "dog grooming", "cat food", "bird food", "pet medicine",
      "aquarium", "pet toys", "dog walker", "pet boarding",
    ],
  },

  {
    name: "Alcohol & Nightlife",
    icon: "wine",
    color: "#7c3aed",
    keywords: [
      "beer", "wine", "whisky", "whiskey", "vodka", "rum",
      "gin", "tequila", "alcohol", "liquor", "spirits", "brandy",
      "bar", "pub", "lounge", "nightclub", "club",
      "brewery", "wine bar", "taproom", "restro bar",
      "heineken", "kingfisher", "budweiser", "tuborg",
      "johnnie walker", "jack daniel", "old monk", "blenders pride",
      "beverages", "drinks", "cocktail", "mocktail",
    ],
  },

  {
    name: "Business Expenses",
    icon: "briefcase",
    color: "#78716c",
    keywords: [
      "office supplies", "stationery office", "printer", "toner",
      "business travel", "client dinner", "client meeting",
      "co-working", "coworking", "wework", "awfis", "innov8",
      "software subscription", "saas", "aws", "google cloud",
      "azure", "zoom", "slack", "notion", "gsuite", "microsoft 365",
      "domain", "hosting", "server", "digitalocean",
      "business expense", "work expense",
    ],
  },

  // ── INCOME ─────────────────────────────────────────────────────────────────

  {
    name: "Salary",
    icon: "wallet",
    color: "#22c55e",
    keywords: [
      "salary", "payroll", "stipend", "wage", "income",
      "monthly pay", "ctc", "take home", "nett salary",
      "credit salary", "pay credit", "salary credited",
    ],
  },

  {
    name: "Freelance",
    icon: "laptop",
    color: "#2dd4bf",
    keywords: [
      "freelance", "freelancing", "consulting", "consultant",
      "contract work", "project payment", "client payment",
      "upwork", "fiverr", "toptal", "99designs", "guru",
      "freelancer.com", "remote work", "gig", "side project",
      "invoice payment", "professional fees",
    ],
  },

  {
    name: "Rental Income",
    icon: "key",
    color: "#fb923c",
    keywords: [
      "rental income", "rent received", "tenant payment",
      "property income", "house rent received", "subletting",
      "airbnb income", "pg income", "lease income",
    ],
  },

  {
    name: "Bonus",
    icon: "award",
    color: "#facc15",
    keywords: [
      "bonus", "incentive", "performance bonus", "annual bonus",
      "joining bonus", "referral bonus", "commission",
      "variable pay", "recognition award", "ex gratia",
    ],
  },

  {
    name: "Investment Returns",
    icon: "trending-up",
    color: "#6366f1",
    keywords: [
      "zerodha", "groww", "upstox", "angel one", "motilal oswal",
      "mutual fund", "sip", "stock", "shares", "equity",
      "fd", "fixed deposit", "ppf", "nps",
      "gold bond", "sgb", "rbi bond", "demat",
      "redemption", "maturity", "withdrawal",
    ],
  },

  {
    name: "Dividends & Interest",
    icon: "percent",
    color: "#818cf8",
    keywords: [
      "dividend", "interest", "interest income", "fd interest",
      "savings interest", "bank interest", "rd maturity",
      "fd maturity", "bond interest", "coupon", "yield",
      "capital gain", "short term gain", "long term gain",
    ],
  },

  {
    name: "Cashback & Refunds",
    icon: "refresh-cw",
    color: "#34d399",
    keywords: [
      "cashback", "refund", "reward points", "rebate",
      "discount credit", "wallet credit", "paytm cashback",
      "phonepe reward", "amazon cashback", "gpay cashback",
      "credit note", "reversal", "return credit", "money back",
    ],
  },

  // ── CATCH-ALL ──────────────────────────────────────────────────────────────
  {
    name: "Other",
    icon: "tag",
    color: "#94a3b8",
    keywords: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Auto-categorization engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to auto-categorize a transaction description.
 * Checks user-defined categories first (higher priority), then falls back
 * to DEFAULT_CATEGORIES. Returns the matched category name or null.
 */
export function autoCategorizeName(
  description: string,
  userCategories: Array<{ name: string; keywords: string[] }> = []
): string | null {
  const lower = description.toLowerCase().trim();

  // 1. User-defined categories take priority
  for (const cat of userCategories) {
    if (cat.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return cat.name;
    }
  }

  // 2. Fall back to defaults (skip "Other" — it's the catch-all)
  for (const def of DEFAULT_CATEGORIES) {
    if (def.name === "Other") continue;
    if (def.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return def.name;
    }
  }

  return null;
}

/**
 * Given a list of DB categories, find the best matching category ID.
 */
export function autoCategorizeId(
  description: string,
  categories: Array<{ id: string; name: string; keywords: string[] }>
): string | null {
  const matchedName = autoCategorizeName(description, categories);
  if (!matchedName) return null;
  const found = categories.find(
    (c) => c.name.toLowerCase() === matchedName.toLowerCase()
  );
  return found?.id ?? null;
}
