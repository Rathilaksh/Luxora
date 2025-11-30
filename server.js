const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const Stripe = require('stripe');
const emailService = require('./services/emailService');
const app = express();
app.use(express.json());
// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    const count = await prisma.listing.count();
    res.json({ status: 'ok', listings: count });
  } catch (err) {
    console.error('DB health error:', err);
    res.status(500).json({ status: 'error', message: 'Database unreachable' });
  }
});

// Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 3002;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_KEY_HERE';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const CLIENT_URL = process.env.CLIENT_URL || `http://localhost:${PORT}`;

// Only initialize Stripe if we have a valid key
const stripe = (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('YOUR_KEY_HERE')) 
  ? null 
  : new Stripe(STRIPE_SECRET_KEY);

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Serve static files from Vite client build (in production) or public folder (fallback)
const clientPath = path.join(__dirname, 'client', 'dist');
const publicPath = path.join(__dirname, 'public');
app.use(express.static(clientPath));
app.use(express.static(publicPath));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  },
});

// Helper function to process and save images
async function processAndSaveImage(buffer, filename, folder = 'listings') {
  const uploadsDir = path.join(__dirname, 'uploads', folder);
  await fs.mkdir(uploadsDir, { recursive: true });

  const filepath = path.join(uploadsDir, filename);

  // Resize and optimize image
  await sharp(buffer)
    .resize(1200, 800, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  return `/uploads/${folder}/${filename}`;
}

// ========== AUTH ENDPOINTS ==========

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone, bio, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = bcrypt.hashSync(password, 10);
    
    const userData = { 
      name, 
      email, 
      passwordHash,
      role: role || 'GUEST' // Default to GUEST if not specified
    };
    if (phone) userData.phone = phone;
    if (bio) userData.bio = bio;
    
    const user = await prisma.user.create({ data: userData });
    const token = createToken(user);
    
    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user).catch(err => 
      console.error('Failed to send welcome email:', err)
    );
    
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = createToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, phone: user.phone, isVerified: user.isVerified, isSuperhost: user.isSuperhost });
});

// Update user profile
app.patch('/api/me', authMiddleware, async (req, res) => {
  try {
    const { name, bio, phone } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, phone: user.phone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload avatar
app.post('/api/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = `avatar_${req.user.id}_${Date.now()}.jpg`;
    const avatarUrl = await processAndSaveImage(req.file.buffer, filename, 'avatars');

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
    });

    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// ========== LISTING ENDPOINTS ==========

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ADVANCED SEARCH endpoint with comprehensive filtering
app.get('/api/listings/search', async (req, res) => {
  try {
    const {
      location, // city or country search
      checkIn, // ISO date string
      checkOut, // ISO date string
      guests,
      bedrooms,
      bathrooms,
      priceMin,
      priceMax,
      roomType,
      amenities, // comma-separated amenity IDs
      sortBy, // price_asc, price_desc, rating, distance
      latitude, // for distance sorting
      longitude,
      radius, // search radius in km
      instantBook,
      petFriendly,
    } = req.query;

    const where = {};
    
    // Location filter (city or country) - SQLite doesn't support mode: 'insensitive'
    if (location) {
      where.OR = [
        { city: { contains: location } },
        { country: { contains: location } },
        { address: { contains: location } }
      ];
    }

    // Price range filter
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) where.price.gte = Number(priceMin);
      if (priceMax) where.price.lte = Number(priceMax);
    }

    // Room type filter
    if (roomType) where.roomType = roomType;

    // Capacity filters
    if (guests) where.maxGuests = { gte: Number(guests) };
    if (bedrooms) where.bedrooms = { gte: Number(bedrooms) };
    if (bathrooms) where.bathrooms = { gte: Number(bathrooms) };

    // Radius-based location filter
    if (latitude && longitude && radius) {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }

    // Fetch listings with includes
    let listings = await prisma.listing.findMany({
      where,
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true, isVerified: true, isSuperhost: true } },
        reviews: {
          select: { id: true, overallRating: true, comment: true, createdAt: true, user: { select: { name: true, avatar: true } } }
        },
        amenities: {
          include: { amenity: true }
        },
        images: {
          orderBy: { displayOrder: 'asc' }
        },
        bookings: checkIn && checkOut ? {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            OR: [
              { 
                checkIn: { lte: new Date(checkOut) },
                checkOut: { gte: new Date(checkIn) }
              }
            ]
          }
        } : false
      },
    });

    // Filter out booked listings if dates provided
    if (checkIn && checkOut) {
      listings = listings.filter(listing => listing.bookings.length === 0);
      // Remove bookings from response
      listings = listings.map(({ bookings, ...rest }) => rest);
    }

    // Filter by amenities if provided
    if (amenities) {
      const amenityIds = amenities.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
      if (amenityIds.length > 0) {
        listings = listings.filter(listing => {
          const listingAmenityIds = listing.amenities.map(a => a.amenity.id);
          return amenityIds.every(id => listingAmenityIds.includes(id));
        });
      }
    }

    // Quick toggle: Pet Friendly (by amenity name)
    if (petFriendly === 'true') {
      listings = listings.filter(listing =>
        listing.amenities.some(a => (a.amenity?.name || '').toLowerCase() === 'pet friendly')
      );
    }

    // Quick toggle: Instant Book (dedicated field)
    if (instantBook === 'true') {
      listings = listings.filter(listing => listing.instantBookEnabled === true);
    }

    // Calculate ratings and distance
    listings = listings.map(listing => {
      const averageRating = listing.reviews.length > 0
        ? listing.reviews.reduce((sum, r) => sum + r.overallRating, 0) / listing.reviews.length
        : null;
      
      let distance = null;
      if (latitude && longitude && listing.latitude && listing.longitude) {
        distance = calculateDistance(
          Number(latitude), 
          Number(longitude), 
          listing.latitude, 
          listing.longitude
        );
      }

      return {
        ...listing,
        averageRating,
        reviewCount: listing.reviews.length,
        distance
      };
    });

    // Filter by radius after distance calculation
    if (latitude && longitude && radius) {
      const maxRadius = Number(radius);
      listings = listings.filter(listing => listing.distance !== null && listing.distance <= maxRadius);
    }

    // Sort results
    if (sortBy === 'price_asc') {
      listings.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      listings.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      listings.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'distance' && latitude && longitude) {
      listings.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    } else {
      // Default: sort by newest
      listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json(listings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET all listings (with host info, reviews, amenities, images) - Legacy endpoint
app.get('/api/listings', async (req, res) => {
  try {
    const startTime = Date.now();
    const { priceMin, priceMax, city, roomType } = req.query;
    const where = {};
    if (city) where.city = { contains: city };
    if (roomType) where.roomType = roomType;
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) where.price.gte = Number(priceMin);
      if (priceMax) where.price.lte = Number(priceMax);
    }
    const listings = await prisma.listing.findMany({
      where,
      include: { 
        host: { select: { id: true, name: true, email: true, avatar: true, isVerified: true, isSuperhost: true } },
        reviews: {
          select: { id: true, overallRating: true, comment: true, createdAt: true, user: { select: { name: true, avatar: true } } }
        },
        amenities: {
          include: { amenity: true }
        },
        images: {
          orderBy: { displayOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate average rating for each listing
    const listingsWithRating = listings.map(listing => ({
      ...listing,
      averageRating: listing.reviews.length > 0 
        ? listing.reviews.reduce((sum, r) => sum + r.overallRating, 0) / listing.reviews.length 
        : null,
      reviewCount: listing.reviews.length
    }));
    
    res.json(listingsWithRating);
    const duration = Date.now() - startTime;
    console.log(`GET /api/listings -> ${listings.length} results in ${duration}ms`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET single listing (with full details)
app.get('/api/listings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { 
        host: { select: { id: true, name: true, email: true, avatar: true, bio: true, phone: true, isVerified: true, isSuperhost: true, responseRate: true, responseTime: true } },
        bookings: true,
        reviews: {
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' }
        },
        amenities: {
          include: { amenity: true }
        },
        images: {
          orderBy: { displayOrder: 'asc' }
        }
      },
    });
    if (!listing) return res.status(404).json({ error: 'Not found' });
    
    // Calculate average rating
    const averageRating = listing.reviews.length > 0 
      ? listing.reviews.reduce((sum, r) => sum + r.overallRating, 0) / listing.reviews.length 
      : null;
    
    res.json({ ...listing, averageRating, reviewCount: listing.reviews.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create listing (authenticated users only)
app.post('/api/listings', authMiddleware, async (req, res) => {
  try {
    const { title, description, city, country, address, price, image, roomType, bedrooms, bathrooms, maxGuests, amenities, latitude, longitude } = req.body;
    if (!title || !city || price == null) {
      return res.status(400).json({ error: 'Missing required fields: title, city, price' });
    }
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    
    const listing = await prisma.listing.create({
      data: {
        title: title.trim(),
        description: (description || '').trim(),
        city: city.trim(),
        country: country || 'USA',
        address: address || '',
        price: numericPrice,
        image: image || '',
        roomType: roomType || 'ENTIRE_PLACE',
        bedrooms: bedrooms ? Number(bedrooms) : 1,
        bathrooms: bathrooms ? Number(bathrooms) : 1,
        maxGuests: maxGuests ? Number(maxGuests) : 2,
        latitude: (latitude !== undefined && latitude !== null && latitude !== '') ? Number(latitude) : null,
        longitude: (longitude !== undefined && longitude !== null && longitude !== '') ? Number(longitude) : null,
        hostId: req.user.id,
      },
    });
    
    // Add amenities if provided
    if (amenities && Array.isArray(amenities)) {
      for (const amenityId of amenities) {
        await prisma.listingAmenity.create({
          data: {
            listingId: listing.id,
            amenityId: Number(amenityId),
          },
        });
      }
    }
    
    // Fetch full listing with relations
    const fullListing = await prisma.listing.findUnique({
      where: { id: listing.id },
      include: {
        host: { select: { id: true, name: true, email: true } },
        amenities: { include: { amenity: true } }
      }
    });
    
    res.status(201).json(fullListing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete listing (host only)
app.delete('/api/listings/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true, hostId: true } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.hostId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    await prisma.listing.delete({ where: { id } });
    // Cascade deletes handle related bookings, reviews, wishlist entries, messages, and amenities.
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload images for a listing
app.post('/api/listings/:id/images', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    const listingId = Number(req.params.id);

    // Check if user owns the listing
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Get current max order
    const currentImages = await prisma.listingImage.findMany({
      where: { listingId },
      orderBy: { displayOrder: 'desc' },
      take: 1,
    });
    let nextOrder = currentImages.length > 0 ? currentImages[0].displayOrder + 1 : 0;

    const imagePromises = req.files.map(async (file) => {
      const filename = `listing_${listingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const url = await processAndSaveImage(file.buffer, filename);

      return prisma.listingImage.create({
        data: {
          url,
          listingId,
          displayOrder: nextOrder++,
          caption: null,
        },
      });
    });

    const images = await Promise.all(imagePromises);
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Reorder listing images
app.put('/api/listings/:id/images/reorder', authMiddleware, async (req, res) => {
  try {
    const listingId = Number(req.params.id);
    const { imageIds } = req.body; // Array of image IDs in desired order

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update order for each image
    const updatePromises = imageIds.map((imageId, index) =>
      prisma.listingImage.update({
        where: { id: Number(imageId) },
        data: { displayOrder: index },
      })
    );

    await Promise.all(updatePromises);

    const updatedImages = await prisma.listingImage.findMany({
      where: { listingId },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(updatedImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reorder images' });
  }
});

// Delete a listing image
app.delete('/api/listings/:id/images/:imageId', authMiddleware, async (req, res) => {
  try {
    const listingId = Number(req.params.id);
    const imageId = Number(req.params.imageId);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const image = await prisma.listingImage.findUnique({ where: { id: imageId } });
    if (!image || image.listingId !== listingId) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await prisma.listingImage.delete({ where: { id: imageId } });
    res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ========== BOOKING ENDPOINTS ==========

// Create booking with overlap check
app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { listingId, checkIn, checkOut, guests } = req.body;
    if (!listingId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    
    // Get user to check role
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    // Prevent hosts from making bookings
    if (user.role === 'HOST') {
      return res.status(403).json({ error: 'Host accounts cannot make bookings. Please create a guest account to book properties.' });
    }
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (start >= end) return res.status(400).json({ error: 'Invalid date range' });

    // Block past-date bookings
    const today = new Date();
    // Normalize to midnight to avoid timezone edge cases
    today.setHours(0, 0, 0, 0);
    const startMid = new Date(start);
    startMid.setHours(0, 0, 0, 0);
    if (startMid < today) {
      return res.status(400).json({ error: 'Cannot book past dates' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: Number(listingId) } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    // Validate guest count
    const guestCount = guests ? Number(guests) : 1;
    if (guestCount > listing.maxGuests) {
      return res.status(400).json({ error: `Maximum ${listing.maxGuests} guests allowed` });
    }
    if (guestCount < 1) {
      return res.status(400).json({ error: 'At least 1 guest required' });
    }

    // Check for overlapping bookings
    const conflict = await prisma.booking.findFirst({
      where: {
        listingId: Number(listingId),
        status: { not: 'CANCELLED' }, // Don't count cancelled bookings
        AND: [
          { checkIn: { lte: end } },
          { checkOut: { gte: start } },
        ],
      },
    });

    if (conflict) return res.status(409).json({ error: 'Dates unavailable' });

    const msPerDay = 24 * 60 * 60 * 1000;
    const nights = Math.ceil((end - start) / msPerDay);
    
    // Calculate total price with extra guest fee
    const basePrice = nights * listing.price;
    const extraGuests = Math.max(0, guestCount - (listing.baseGuests || 2));
    const extraGuestTotal = extraGuests * (listing.extraGuestFee || 0) * nights;
    const totalPrice = basePrice + extraGuestTotal;

    const booking = await prisma.booking.create({
      data: {
        listingId: Number(listingId),
        userId: req.user.id,
        checkIn: start,
        checkOut: end,
        totalPrice,
        guests: guestCount,
        status: 'PENDING',
      },
      include: {
        listing: { select: { title: true, city: true, image: true } },
        user: { select: { name: true, email: true } }
      }
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's bookings (as a guest)
app.get('/api/bookings/my-bookings', authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            image: true,
            images: { take: 1, orderBy: { displayOrder: 'asc' } },
            host: { select: { id: true, name: true, email: true, avatar: true } }
          }
        }
      },
      orderBy: { checkIn: 'desc' }
    });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bookings for listings the user hosts
app.get('/api/bookings/hosting', authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        listing: { hostId: req.user.id }
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            image: true,
            images: { take: 1, orderBy: { displayOrder: 'asc' } }
          }
        },
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { checkIn: 'desc' }
    });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Host analytics endpoint
// Get host calendar view (all bookings across listings)
app.get('/api/host/calendar', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const where = {
      listing: { hostId: userId }
    };

    // Filter by date range if provided
    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        where.OR.push({ checkOut: { gte: new Date(startDate) } });
      }
      if (endDate) {
        where.OR.push({ checkIn: { lte: new Date(endDate) } });
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            image: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true
          }
        }
      },
      orderBy: { checkIn: 'asc' }
    });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/host/analytics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all bookings for host's listings
    const bookings = await prisma.booking.findMany({
      where: {
        listing: { hostId: userId },
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      },
      include: {
        listing: { select: { price: true } }
      }
    });

    // Calculate revenue
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    
    // Revenue this month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthRevenue = bookings.filter(b => 
      new Date(b.createdAt) >= thisMonthStart
    ).reduce((sum, b) => sum + b.totalPrice, 0);
    
    const lastMonthRevenue = bookings.filter(b => {
      const date = new Date(b.createdAt);
      return date >= lastMonthStart && date < thisMonthStart;
    }).reduce((sum, b) => sum + b.totalPrice, 0);
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

    // Count upcoming bookings
    const upcomingBookings = bookings.filter(b => 
      new Date(b.checkIn) > now && b.status === 'CONFIRMED'
    ).length;

    // Get host's listings
    const listings = await prisma.listing.findMany({
      where: { hostId: userId },
      include: {
        bookings: { where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }
      }
    });

    // Calculate occupancy rate
    const totalDays = listings.reduce((sum, l) => {
      const bookedDays = l.bookings.reduce((days, b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return days + Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      }, 0);
      return sum + bookedDays;
    }, 0);
    
    const daysInYear = 365;
    const occupancyRate = listings.length > 0 
      ? Math.round((totalDays / (listings.length * daysInYear)) * 100)
      : 0;

    // Get reviews for host's listings
    const reviews = await prisma.review.findMany({
      where: {
        listing: { hostId: userId }
      },
      select: { overallRating: true }
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
      : 0;

    // Monthly revenue breakdown (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const revenue = bookings.filter(b => {
        const date = new Date(b.createdAt);
        return date >= monthStart && date < monthEnd;
      }).reduce((sum, b) => sum + b.totalPrice, 0);
      
      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue
      });
    }

    res.json({
      userId,
      totalRevenue,
      revenueGrowth,
      totalBookings: bookings.length,
      upcomingBookings,
      occupancyRate,
      averageRating,
      totalReviews: reviews.length,
      listingsCount: listings.length,
      monthlyRevenue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel a booking
// Host actions: Accept/Reject booking
app.patch('/api/bookings/:id/status', authMiddleware, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be CONFIRMED or CANCELLED' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        listing: { select: { hostId: true, title: true } },
        user: { select: { name: true, email: true } }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only host can accept/reject
    if (booking.listing.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can change booking status' });
    }

    // Update booking status
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        listing: { select: { id: true, title: true, city: true, image: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { select: { hostId: true } } }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only the guest or host can cancel
    if (booking.userId !== req.user.id && booking.listing.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    // Check if booking is already cancelled or completed
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }
    if (booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    // Update booking status
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            image: true
          }
        }
      }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get availability (blocked dates) for a listing
app.get('/api/listings/:id/availability', async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    
    // Get all confirmed and pending bookings for this listing
    const bookings = await prisma.booking.findMany({
      where: {
        listingId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      select: {
        checkIn: true,
        checkOut: true
      }
    });

    // Return array of booked date ranges
    const blockedDates = bookings.map(booking => ({
      from: booking.checkIn,
      to: booking.checkOut
    }));

    res.json({ blockedDates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET bookings (filter by userId or listingId)
app.get('/api/bookings', async (req, res) => {
  try {
    const { userId, listingId } = req.query;
    const where = {};
    if (userId) where.userId = Number(userId);
    if (listingId) where.listingId = Number(listingId);
    const bookings = await prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== REVIEW ENDPOINTS ==========

// GET reviews for a listing
app.get('/api/listings/:id/reviews', async (req, res) => {
  try {
    const listingId = Number(req.params.id);
    const reviews = await prisma.review.findMany({
      where: { listingId, isPublic: true },
      include: { 
        user: { select: { id: true, name: true, avatar: true } },
        photos: true,
        booking: { select: { checkIn: true, checkOut: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a review (requires completed booking)
app.post('/api/reviews', authMiddleware, upload.array('photos', 5), async (req, res) => {
  try {
    const { 
      bookingId, 
      overallRating, 
      cleanlinessRating, 
      accuracyRating, 
      checkInRating,
      communicationRating,
      locationRating,
      valueRating,
      comment 
    } = req.body;
    
    // Validate overall rating
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ error: 'Overall rating must be between 1 and 5' });
    }
    
    // Check if booking exists and belongs to user
    const booking = await prisma.booking.findUnique({ 
      where: { id: parseInt(bookingId) },
      include: { 
        listing: { include: { host: true } },
        user: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to review this booking' });
    }
    
    // Check if booking is completed
    if (booking.status !== 'COMPLETED' && new Date() < new Date(booking.checkOut)) {
      return res.status(400).json({ error: 'Can only review completed stays' });
    }
    
    // Check if review already exists for this booking
    const existing = await prisma.review.findUnique({
      where: { bookingId: parseInt(bookingId) }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this booking' });
    }
    
    // Process uploaded photos
    const photoUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const url = await processAndSaveImage(file.buffer, filename, 'reviews');
        photoUrls.push(url);
      }
    }
    
    // Create review with photos
    const review = await prisma.review.create({
      data: {
        bookingId: parseInt(bookingId),
        listingId: booking.listingId,
        userId: req.user.id,
        overallRating: parseInt(overallRating),
        cleanlinessRating: cleanlinessRating ? parseInt(cleanlinessRating) : null,
        accuracyRating: accuracyRating ? parseInt(accuracyRating) : null,
        checkInRating: checkInRating ? parseInt(checkInRating) : null,
        communicationRating: communicationRating ? parseInt(communicationRating) : null,
        locationRating: locationRating ? parseInt(locationRating) : null,
        valueRating: valueRating ? parseInt(valueRating) : null,
        comment: comment || null,
        photos: {
          create: photoUrls.map((url, index) => ({
            url,
            caption: null
          }))
        }
      },
      include: { 
        user: { select: { id: true, name: true, avatar: true } },
        photos: true,
        booking: { 
          select: { 
            checkIn: true, 
            checkOut: true,
            listing: { select: { title: true, host: { select: { name: true, email: true } } } }
          } 
        }
      }
    });
    
    // Send email notification to host (non-blocking)
    emailService.sendReviewNotification(review).catch(err =>
      console.error('Failed to send review notification:', err)
    );
    
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH - Host responds to a review
app.patch('/api/reviews/:id/respond', authMiddleware, async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const { hostResponse } = req.body;
    
    if (!hostResponse || hostResponse.trim().length === 0) {
      return res.status(400).json({ error: 'Response cannot be empty' });
    }
    
    // Get review with listing to check host ownership
    const review = await prisma.review.findUnique({ 
      where: { id: reviewId },
      include: { 
        listing: { select: { hostId: true } },
        user: { select: { name: true, email: true } },
        booking: { select: { listing: { select: { title: true } } } }
      }
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (review.listing.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can respond to this review' });
    }
    
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        hostResponse: hostResponse.trim(),
        hostRespondedAt: new Date()
      },
      include: { 
        user: { select: { id: true, name: true, avatar: true } },
        photos: true
      }
    });
    
    // Send email notification to guest (non-blocking)
    emailService.sendHostResponseNotification({
      ...updated,
      guestName: review.user.name,
      guestEmail: review.user.email,
      listingTitle: review.booking.listing.title
    }).catch(err =>
      console.error('Failed to send host response notification:', err)
    );
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET reviews that need response (for hosts)
app.get('/api/reviews/pending-response', authMiddleware, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        listing: { hostId: req.user.id },
        hostResponse: null,
        isPublic: true
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        listing: { select: { id: true, title: true } },
        photos: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE review endpoint removed - reviews are permanent for integrity

// ========== WISHLIST ENDPOINTS ==========

// GET user's wishlist
app.get('/api/wishlists', authMiddleware, async (req, res) => {
  try {
    const wishlists = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: {
            host: { select: { id: true, name: true } },
            reviews: { select: { overallRating: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Add average rating to each listing
    const wishlistsWithRating = wishlists.map(w => ({
      ...w,
      listing: {
        ...w.listing,
        averageRating: w.listing.reviews.length > 0
          ? w.listing.reviews.reduce((sum, r) => sum + r.overallRating, 0) / w.listing.reviews.length
          : null,
        reviewCount: w.listing.reviews.length
      }
    }));
    
    res.json(wishlistsWithRating);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADD to wishlist
app.post('/api/wishlists', authMiddleware, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'Missing listingId' });
    
    // Check if listing exists
    const listing = await prisma.listing.findUnique({ where: { id: Number(listingId) } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: { userId_listingId: { userId: req.user.id, listingId: Number(listingId) } }
    });
    if (existing) {
      return res.status(409).json({ error: 'Already in wishlist' });
    }
    
    const wishlist = await prisma.wishlist.create({
      data: {
        userId: req.user.id,
        listingId: Number(listingId),
      },
      include: { listing: true }
    });
    
    res.status(201).json(wishlist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REMOVE from wishlist
app.delete('/api/wishlists/:listingId', authMiddleware, async (req, res) => {
  try {
    const listingId = Number(req.params.listingId);
    
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId_listingId: { userId: req.user.id, listingId } }
    });
    
    if (!wishlist) return res.status(404).json({ error: 'Not in wishlist' });
    
    await prisma.wishlist.delete({
      where: { userId_listingId: { userId: req.user.id, listingId } }
    });
    
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CHECK if listing is in wishlist
app.get('/api/wishlists/check/:listingId', authMiddleware, async (req, res) => {
  try {
    const listingId = Number(req.params.listingId);
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId_listingId: { userId: req.user.id, listingId } }
    });
    res.json({ inWishlist: !!wishlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== MESSAGE ENDPOINTS ==========

// GET user's messages (conversations)
app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
        listing: { select: { id: true, title: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET conversation between two users
app.get('/api/messages/conversation/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const otherUserId = Number(req.params.otherUserId);
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.user.id }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
        listing: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SEND a message
app.post('/api/messages', authMiddleware, async (req, res) => {
  try {
    const { receiverId, content, listingId } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) } });
    if (!receiver) return res.status(404).json({ error: 'Receiver not found' });
    
    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId: Number(receiverId),
        content,
        ...(listingId && { listingId: Number(listingId) })
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
        listing: { select: { id: true, title: true } }
      }
    });
    
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// MARK message as read
app.patch('/api/messages/:id/read', authMiddleware, async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { read: true }
    });
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== AMENITY ENDPOINTS ==========

// GET all amenities
app.get('/api/amenities', async (req, res) => {
  try {
    const amenities = await prisma.amenity.findMany({
      orderBy: { category: 'asc' }
    });
    
    // Group by category
    const grouped = amenities.reduce((acc, amenity) => {
      if (!acc[amenity.category]) acc[amenity.category] = [];
      acc[amenity.category].push(amenity);
      return acc;
    }, {});
    
    res.json({ amenities, grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== PAYMENT ENDPOINT ==========

// Mock payment intent endpoint (placeholder for Stripe integration)
app.post('/api/pay/intent', authMiddleware, async (req, res) => {
  // In future: integrate Stripe and return real clientSecret
  res.json({ clientSecret: 'mock_secret_123', amountPreview: req.body.amount || 0 });
});

// ========== PAYMENT ENDPOINTS ==========

// Create Stripe Checkout Session
app.post('/api/payments/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    // Validate Stripe configuration; if missing, fall back to mock mode
    if (!stripe) {
      return res.status(200).json({
        mode: 'mock',
        sessionId: 'mock_session_' + Date.now(),
        message: 'Stripe not configured; proceeding without real payment',
      });
    }

    const { listingId, checkIn, checkOut, guests } = req.body;

    // Validate input
    if (!listingId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get listing details
    const listing = await prisma.listing.findUnique({
      where: { id: parseInt(listingId) },
      include: { host: true }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Calculate total price
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Calculate guest pricing
    let totalPrice = nights * listing.price;
    if (guests > listing.baseGuests) {
      const extraGuests = guests - listing.baseGuests;
      totalPrice += nights * extraGuests * listing.extraGuestFee;
    }

    // Check availability (no overlapping bookings)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        listingId: parseInt(listingId),
        status: { not: 'CANCELLED' },
        OR: [
          { AND: [{ checkIn: { lte: start } }, { checkOut: { gt: start } }] },
          { AND: [{ checkIn: { lt: end } }, { checkOut: { gte: end } }] },
          { AND: [{ checkIn: { gte: start } }, { checkOut: { lte: end } }] }
        ]
      }
    });

    if (conflictingBooking) {
      return res.status(409).json({ error: 'Listing not available for selected dates' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: listing.title,
              description: `${nights} nights • ${guests} guests`,
              images: listing.image ? [`${CLIENT_URL}${listing.image}`] : []
            },
            unit_amount: totalPrice * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: req.user.id.toString(),
        listingId: listingId.toString(),
        checkIn: start.toISOString(),
        checkOut: end.toISOString(),
        guests: guests.toString(),
        totalPrice: totalPrice.toString()
      },
      success_url: `${CLIENT_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/?payment=cancelled`,
    });

    res.json({ sessionId: session.id, url: session.url, mode: 'stripe' });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Verify payment and create booking
app.get('/api/payments/verify/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Handle mock sessions (when Stripe not configured or mock session)
    // Must check BEFORE calling Stripe API to avoid validation errors
    if (!stripe || sessionId.includes('mock')) {
      return res.status(200).json({
        booking: {
          id: 0,
          checkIn: new Date(),
          checkOut: new Date(Date.now() + 86400000),
          guests: 1,
          totalPrice: 0,
          listing: { title: 'Mock Booking (Stripe Not Configured)' }
        },
        mock: true,
        message: 'This is a test booking. Configure Stripe to enable real payments.'
      });
    }

    // Only reach here if Stripe is configured AND it's not a mock session
    // Retrieve the session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      console.error('Stripe retrieve error:', stripeError);
      return res.status(400).json({ error: 'Invalid session ID or session not found' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Check if booking already exists for this session
    const existingBooking = await prisma.booking.findFirst({
      where: { stripeSessionId: sessionId }
    });

    if (existingBooking) {
      return res.json({ booking: existingBooking });
    }

    // Extract metadata
    const { userId, listingId, checkIn, checkOut, guests, totalPrice } = session.metadata;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: parseInt(userId),
        listingId: parseInt(listingId),
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guests: parseInt(guests),
        totalPrice: parseInt(totalPrice),
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        stripeSessionId: sessionId,
        stripePaymentId: session.payment_intent
      },
      include: {
        listing: {
          include: {
            host: true
          }
        },
        user: true
      }
    });

    // Send confirmation emails (non-blocking)
    emailService.sendBookingConfirmation(booking).catch(err =>
      console.error('Failed to send booking confirmation email:', err)
    );
    emailService.sendHostBookingNotification(booking).catch(err =>
      console.error('Failed to send host notification email:', err)
    );

    res.json({ booking });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Webhook endpoint for Stripe events (optional but recommended for production)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Create booking from webhook (if not already created by verify endpoint)
      const { userId, listingId, checkIn, checkOut, guests, totalPrice } = session.metadata;
      
      const existingBooking = await prisma.booking.findFirst({
        where: { stripeSessionId: session.id }
      });

      if (!existingBooking && session.payment_status === 'paid') {
        const booking = await prisma.booking.create({
          data: {
            userId: parseInt(userId),
            listingId: parseInt(listingId),
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            guests: parseInt(guests),
            totalPrice: parseInt(totalPrice),
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            stripeSessionId: session.id,
            stripePaymentId: session.payment_intent
          },
          include: {
            listing: {
              include: {
                host: true
              }
            },
            user: true
          }
        });
        
        // Send confirmation emails (non-blocking)
        emailService.sendBookingConfirmation(booking).catch(err =>
          console.error('Failed to send booking confirmation email:', err)
        );
        emailService.sendHostBookingNotification(booking).catch(err =>
          console.error('Failed to send host notification email:', err)
        );
      }
      break;
    case 'payment_intent.payment_failed':
      // Handle failed payment
      console.log('Payment failed:', event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// ========== FALLBACK ROUTE ==========

// fallback to index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Run "npm run build:client" to build the frontend first.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Log unhandled promise rejections to aid debugging instead of silent exits
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
