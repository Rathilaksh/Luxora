# Luxora - Vacation Rental Platform

A full-stack Airbnb-style vacation rental platform with advanced search, filtering, and map integration.

## 🌟 Features

### Core Functionality
- ✅ **User Authentication**: JWT-based secure login and registration
- ✅ **Listing Management**: Create, view, edit, and delete vacation rentals
- ✅ **Booking System**: Reserve listings with date validation
- ✅ **Reviews & Ratings**: Rate and review stays
- ✅ **Wishlist**: Save favorite listings
- ✅ **Messaging**: Direct communication between hosts and guests
- ✅ **User Profiles**: Customizable profiles with avatars and verification badges

### Advanced Search & Filtering (NEW!)
- 🔍 **Smart Search Bar**: Location, dates, and guest count
- 🎯 **Comprehensive Filters**: Price, room type, bedrooms, bathrooms, amenities
- 🗺️ **Interactive Map View**: Mapbox integration with clickable markers
- �� **Availability Search**: Filter by check-in/check-out dates
- 📊 **Multiple Sorting**: By price, rating, distance, or newest

### Image Management
- 📸 Multi-image galleries with carousel
- ⬆️ Drag-and-drop image uploads
- 🖼️ Automatic image optimization
- 🎨 Lightbox view

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Set up database
npx prisma migrate dev
npx prisma db seed

# Build client
cd client && npm run build && cd ..

# Start server
node server.js

# Open http://localhost:3000
\`\`\`

## 📦 Tech Stack

**Backend**: Node.js, Express, Prisma, SQLite, JWT, Multer, Sharp  
**Frontend**: React 18, Vite, Mapbox GL, react-datepicker, lucide-react

## 🔍 Search Features

### Advanced Search Endpoint
\`GET /api/listings/search?location=miami&checkIn=2024-12-20&checkOut=2024-12-25&guests=4&priceMin=50&priceMax=200&bedrooms=2&amenities=1,3,5&sortBy=price_asc\`

### Supported Filters
- **location**: Search city, country, or address
- **checkIn/checkOut**: Date range (YYYY-MM-DD)
- **guests**: Minimum guest capacity
- **bedrooms/bathrooms**: Minimum count
- **priceMin/priceMax**: Price range per night
- **roomType**: ENTIRE_PLACE, PRIVATE_ROOM, SHARED_ROOM
- **amenities**: Comma-separated amenity IDs
- **sortBy**: price_asc, price_desc, rating, distance
- **latitude/longitude/radius**: Location-based search (km)

## 🗺️ Map Integration

The map view requires a Mapbox token. Get one free at https://www.mapbox.com/

Create \`client/.env\`:
\`\`\`env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
\`\`\`

## 📊 Database Schema

- **User**: Profiles, authentication, verification status
- **Listing**: Properties with lat/lng coordinates
- **ListingImage**: Multi-image support with ordering
- **Booking**: Reservations with date validation
- **Review**: Ratings and comments
- **Amenity**: Filterable features (WiFi, Pool, etc.)
- **Wishlist**: Saved favorites
- **Message**: User-to-user chat

## 🧪 Test Credentials

\`\`\`
Email: test@example.com
Password: password
\`\`\`

## 🛠️ Development

\`\`\`bash
# Server with auto-restart
npm run dev

# Client dev server (optional)
cd client && npm run dev

# Database studio
npx prisma studio

# Create migration
npx prisma migrate dev --name migration_name
\`\`\`

## 🌐 API Endpoints

### Search & Listings
- \`GET /api/listings/search\` - Advanced search
- \`GET /api/listings\` - All listings
- \`POST /api/listings\` - Create (auth)
- \`PUT /api/listings/:id\` - Update (auth)
- \`DELETE /api/listings/:id\` - Delete (auth)

### Images
- \`POST /api/listings/:id/images\` - Upload
- \`PUT /api/listings/:id/images/reorder\` - Reorder
- \`DELETE /api/listings/:id/images/:imageId\` - Delete

### Auth
- \`POST /api/register\` - Sign up
- \`POST /api/login\` - Sign in
- \`GET /api/me\` - Profile

### Bookings, Reviews, Wishlist, Messages
See full API documentation in the codebase.

## 🚀 Deployment

**Backend**: Deploy to Render, Railway, or Heroku  
**Database**: Migrate to PostgreSQL/MySQL for production  
**Frontend**: Already built into \`client/dist\` and served by Express

## 📝 License

MIT License - Free to use for personal or commercial projects!

---

**Built by Rathilaksh** | [GitHub](https://github.com/Rathilaksh/Luxora)
