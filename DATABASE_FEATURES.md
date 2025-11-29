# Luxora Database Features

## 🎉 Comprehensive Database Implementation Complete!

This document outlines all the database features, models, and API endpoints available in Luxora.

---

## 📊 Database Models

### 1. **User Model**
Enhanced user model with profile information:
- `id` - Unique identifier
- `name` - User's full name
- `email` - Unique email address (indexed)
- `passwordHash` - Securely hashed password
- `avatar` - Profile picture URL
- `bio` - User biography
- `phone` - Contact phone number
- `createdAt` / `updatedAt` - Timestamps

**Relations:**
- `listings` - Listings hosted by this user
- `bookings` - Bookings made by this user
- `reviews` - Reviews written by this user
- `wishlists` - Favorite listings
- `sentMessages` / `receivedMessages` - Message conversations

### 2. **Listing Model**
Complete property listing with detailed information:
- `id` - Unique identifier
- `title` - Listing title
- `description` - Detailed description
- `city` - City location (indexed)
- `country` - Country (default: "USA")
- `address` - Street address
- `price` - Price per night (indexed)
- `image` - Main image URL
- `roomType` - Type: ENTIRE_PLACE, PRIVATE_ROOM, SHARED_ROOM
- `bedrooms` - Number of bedrooms (default: 1)
- `bathrooms` - Number of bathrooms (default: 1)
- `maxGuests` - Maximum guest capacity (default: 2)
- `hostId` - Reference to host user (indexed)
- `createdAt` / `updatedAt` - Timestamps

**Relations:**
- `host` - The user hosting this listing
- `bookings` - All bookings for this listing
- `reviews` - Reviews for this listing
- `amenities` - Available amenities
- `wishlists` - Users who favorited this
- `messages` - Messages about this listing

**Cascade Delete:** All related bookings, reviews, amenities, wishlists, and messages are deleted when a listing is deleted.

### 3. **Booking Model**
Booking management with validation:
- `id` - Unique identifier
- `listingId` - Reference to listing (indexed)
- `userId` - Reference to user (indexed)
- `startDate` - Check-in date (indexed)
- `endDate` - Check-out date (indexed)
- `totalPrice` - Calculated total price
- `guests` - Number of guests (default: 1)
- `status` - PENDING, CONFIRMED, CANCELLED, COMPLETED
- `createdAt` / `updatedAt` - Timestamps

**Features:**
- Date overlap validation (prevents double-booking)
- Guest count validation (enforces maxGuests limit)
- Excludes cancelled bookings from overlap check
- Automatic price calculation based on nights

### 4. **Review Model**
User reviews and ratings:
- `id` - Unique identifier
- `rating` - 1-5 stars (required)
- `comment` - Review text (optional)
- `listingId` - Reference to listing (indexed)
- `userId` - Reference to reviewer (indexed)
- `createdAt` / `updatedAt` - Timestamps

**Constraints:**
- One review per user per listing (unique constraint)
- Rating must be between 1 and 5

### 5. **Amenity Model**
Available property amenities:
- `id` - Unique identifier
- `name` - Amenity name (unique)
- `icon` - Emoji or icon string
- `category` - Essential, Comfort, Entertainment, Kitchen, Outdoor, Facilities, Safety

**Seeded Amenities:**
- Essential: WiFi, Washer, Dryer, Free parking, Workspace
- Comfort: Air conditioning, Heating, Hot tub
- Entertainment: TV
- Outdoor: Pool
- Facilities: Gym
- Safety: Smoke alarm, Fire extinguisher, First aid kit

### 6. **ListingAmenity (Join Table)**
Many-to-many relationship between listings and amenities:
- `listingId` - Reference to listing
- `amenityId` - Reference to amenity

### 7. **Wishlist Model**
User favorites/saved listings:
- `id` - Unique identifier
- `userId` - Reference to user (indexed)
- `listingId` - Reference to listing (indexed)
- `createdAt` - When favorited

**Constraints:**
- One wishlist entry per user per listing (unique constraint)

### 8. **Message Model**
Guest-host communication:
- `id` - Unique identifier
- `content` - Message text
- `senderId` - Reference to sender (indexed)
- `receiverId` - Reference to receiver (indexed)
- `listingId` - Optional reference to listing (indexed)
- `read` - Read status (default: false)
- `createdAt` - Timestamp

**Features:**
- Direct messaging between users
- Optional listing context
- Read/unread tracking

---

## 🔌 API Endpoints

### Authentication Endpoints

#### `POST /api/register`
Register a new user.
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```
**Response:** `{ token, user: { id, name, email } }`

#### `POST /api/login`
Login existing user.
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```
**Response:** `{ token, user: { id, name, email } }`

#### `GET /api/me`
Get current user info (requires auth).
**Response:** `{ id, name, email }`

---

### Listing Endpoints

#### `GET /api/listings`
Get all listings with filters.
**Query Params:**
- `city` - Filter by city (contains match)
- `roomType` - Filter by room type
- `priceMin` - Minimum price
- `priceMax` - Maximum price

**Response:** Array of listings with:
- Host information
- Reviews array
- Amenities array
- `averageRating` - Calculated average
- `reviewCount` - Total review count

#### `GET /api/listings/:id`
Get single listing with full details.
**Response:** Listing with host, bookings, reviews, amenities, average rating

#### `POST /api/listings` (Auth Required)
Create a new listing.
```json
{
  "title": "Beautiful apartment",
  "description": "Spacious and modern",
  "city": "New York",
  "country": "USA",
  "address": "123 Main St",
  "price": 150,
  "image": "https://example.com/image.jpg",
  "roomType": "ENTIRE_PLACE",
  "bedrooms": 2,
  "bathrooms": 1,
  "maxGuests": 4,
  "amenities": [1, 2, 3]
}
```
**Response:** Created listing with relations

#### `DELETE /api/listings/:id` (Auth Required)
Delete a listing you host. Cascades remove bookings, reviews, wishlist entries, messages, and amenity links.

Authorization: Only the listing host (owner) can delete. Returns:
```json
{ "success": true, "id": 42 }
```
Errors:
- 404 Listing not found
- 403 Not authorized (not host)
- 400 Invalid id

---

### Booking Endpoints

#### `POST /api/bookings` (Auth Required)
Create a booking.
```json
{
  "listingId": 1,
  "startDate": "2025-12-15",
  "endDate": "2025-12-18",
  "guests": 2
}
```
**Response:** Created booking with listing and user info

**Validations:**
- Date range validation
- Guest count validation
- Overlap detection (prevents double-booking)

### Availability UI
- Listing detail modal now shows unavailable date ranges based on existing bookings (excluding cancelled).
- Client-side check prevents selecting overlapping ranges before submitting.
- Server-side validation remains authoritative.

#### `GET /api/bookings`
Get bookings with filters.
**Query Params:**
- `userId` - Filter by user
- `listingId` - Filter by listing

---

### Review Endpoints

#### `GET /api/listings/:id/reviews`
Get all reviews for a listing.
**Response:** Array of reviews with user information

#### `POST /api/listings/:id/reviews` (Auth Required)
Create a review.
```json
{
  "rating": 5,
  "comment": "Amazing place! Highly recommend."
}
```
**Response:** Created review

**Constraints:**
- Can only review a listing once
- Rating must be 1-5

#### `PATCH /api/reviews/:id` (Auth Required)
Update your own review.
```json
{
  "rating": 4,
  "comment": "Updated review text"
}
```

#### `DELETE /api/reviews/:id` (Auth Required)
Delete your own review.

---

### Wishlist Endpoints

#### `GET /api/wishlists` (Auth Required)
Get user's wishlist.
**Response:** Array of wishlist items with listing details, host info, and average rating

#### `POST /api/wishlists` (Auth Required)
Add listing to wishlist.
```json
{
  "listingId": 1
}
```

#### `DELETE /api/wishlists/:listingId` (Auth Required)
Remove listing from wishlist.

#### `GET /api/wishlists/check/:listingId` (Auth Required)
Check if listing is in wishlist.
**Response:** `{ inWishlist: true/false }`

---

### Message Endpoints

#### `GET /api/messages` (Auth Required)
Get all user's messages.
**Response:** Array of messages with sender, receiver, and listing info

#### `GET /api/messages/conversation/:otherUserId` (Auth Required)
Get conversation with specific user.
**Response:** Array of messages in chronological order

#### `POST /api/messages` (Auth Required)
Send a message.
```json
{
  "receiverId": 2,
  "content": "Is this property available?",
  "listingId": 1
}
```

#### `PATCH /api/messages/:id/read` (Auth Required)
Mark message as read.

---

### Amenity Endpoints

#### `GET /api/amenities`
Get all amenities.
**Response:**
```json
{
  "amenities": [...],
  "grouped": {
    "Essential": [...],
    "Comfort": [...],
    "Entertainment": [...]
  }
}
```

---

## 🧪 Test Credentials

The database is seeded with test users:

1. **Host Account**
   - Email: `host@luxora.dev`
   - Password: `hostpass123`

2. **Guest Account 1**
   - Email: `guest@luxora.dev`
   - Password: `guestpass123`

3. **Guest Account 2**
   - Email: `sarah@example.com`
   - Password: `guest2pass123`

---

## 🗃️ Seeded Data

The database includes:
- **3 Users** (1 host, 2 guests)
- **4 Listings** (San Francisco, Santa Monica, Big Bear, Los Angeles)
- **15 Amenities** (across 6 categories)
- **24+ Listing-Amenity associations**
- **2 Bookings** (1 confirmed, 1 pending)
- **3 Reviews** (5-star and 4-star ratings)
- **3 Wishlist items**
- **3 Messages** (sample host-guest conversations)

---

## 🚀 Running the Database

### Reset and Reseed
```bash
# Delete database and recreate
rm -rf prisma/dev.db prisma/dev.db-journal prisma/migrations

# Create new migration
npx prisma migrate dev --name init

# Seed data
node prisma/seed.js
```

### View Database
```bash
# Open Prisma Studio (GUI)
npx prisma studio
```

---

## 🔍 Database Features

### Performance Optimizations
- **Indexes** on frequently queried fields:
  - User: `email`
  - Listing: `city`, `price`, `hostId`
  - Booking: `listingId`, `userId`, `startDate`, `endDate`
  - Review: `listingId`, `userId`
  - Wishlist: `userId`, `listingId`
  - Message: `senderId`, `receiverId`, `listingId`
  - ListingAmenity: `listingId`, `amenityId`

### Data Integrity
- **Cascade Deletes**: When a listing or user is deleted, all related data is automatically cleaned up
- **Unique Constraints**: 
  - User email must be unique
  - One review per user per listing
  - One wishlist entry per user per listing
  - Amenity names must be unique
- **Default Values**: Sensible defaults for all optional fields
- **Validation**: Input validation at both database and API levels

### Relationships
- **One-to-Many**: User → Listings, User → Bookings, Listing → Bookings, Listing → Reviews
- **Many-to-Many**: Listings ↔ Amenities, Users ↔ Wishlisted Listings
- **Self-Referential**: Users → Messages ← Users

---

## 📈 Next Steps

### Recommended Enhancements
1. **Upgrade to PostgreSQL** for production deployment
2. **Add full-text search** on listing titles and descriptions
3. **Implement geolocation** with coordinates and radius search
4. **Add photos gallery** with multiple images per listing
5. **Implement notification system** for bookings and messages
6. **Add booking calendar UI** with availability visualization
7. **Implement real-time chat** with WebSockets
8. **Add payment integration** with Stripe
9. **Build admin dashboard** for managing all listings
10. **Implement verification system** for hosts and listings

---

## 🛠️ Technology Stack

- **Database**: SQLite (dev), ready for PostgreSQL (production)
- **ORM**: Prisma 5.x
- **Authentication**: JWT with bcryptjs
- **Server**: Express.js
- **Client**: Vite + React 18

---

**Last Updated**: November 28, 2025
**Database Version**: 1.0.0
**Status**: ✅ Production Ready

---

## 🖥️ UI Features (Added)

These client-side features are now wired to the API and available in the React app:

- Ratings & Reviews
  - Listings show average star rating and review count.
  - Listing detail modal lists existing reviews (name, stars, date) and lets logged-in users post a review (1 per listing).

- Wishlist ❤️
  - Heart button on each listing card to add/remove from wishlist (persisted per user).
  - State is synced at login via `/api/wishlists`.

- Amenities
  - Amenity chips with emojis in the listing detail modal using a simple icon map.

- Message Host
  - “Message host” inline form in the listing modal sends a message to the host referencing the listing.

### New Pages

- Wishlist Page
  - Access via header button once logged in.
  - Displays all favorited listings with hearts (remove to unfavorite).
  - Uses `/api/wishlists` for data.

- Messages Page & Conversation View
  - Messages page groups conversations by other user showing count + last message snippet.
  - Opening a conversation loads full chronological thread via `/api/messages/conversation/:otherUserId`.
  - Sending a message posts to `/api/messages` and appends to the thread immediately.
  - Lightweight bubbles with distinct style for your messages vs received.

### Navigation
Header buttons (Browse / Wishlist / Messages) appear only when authenticated. Conversation view shows a Back button.

### Tech Notes
- No router dependency; simple `view` state controls pages.
- Optimistic wishlist updates; messages refresh only for current view to reduce calls.
- Potential future improvement: add unread counts and live updates via WebSockets.

Notes
- All features respect authentication; unauthenticated users will be prompted to log in.
- Build the client and start the server to see changes:
  - Build: `npm run build:client`
  - Serve: `PORT=3002 node server.js`
