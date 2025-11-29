const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const app = express();
app.use(express.json());

// Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 3000;

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
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    const token = createToken(user);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
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
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, phone: user.phone, isVerified: user.isVerified, isSuperhost: user.isSuperhost });
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

// GET all listings (with host info, reviews, amenities, images)
app.get('/api/listings', async (req, res) => {
  try {
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
          select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true, avatar: true } } }
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
        ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length 
        : null,
      reviewCount: listing.reviews.length
    }));
    
    res.json(listingsWithRating);
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
      ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length 
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
    const { title, description, city, country, address, price, image, roomType, bedrooms, bathrooms, maxGuests, amenities } = req.body;
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
    const { listingId, startDate, endDate, guests } = req.body;
    if (!listingId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
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
          { startDate: { lte: end } },
          { endDate: { gte: start } },
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
        startDate: start,
        endDate: end,
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
      where: { listingId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a review (must be authenticated, can only review once per listing)
app.post('/api/listings/:id/reviews', authMiddleware, async (req, res) => {
  try {
    const listingId = Number(req.params.id);
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if listing exists
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    // Check if user already reviewed this listing
    const existing = await prisma.review.findUnique({
      where: { listingId_userId: { listingId, userId: req.user.id } }
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this listing' });
    }
    
    const review = await prisma.review.create({
      data: {
        listingId,
        userId: req.user.id,
        rating: Number(rating),
        comment: comment || '',
      },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });
    
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE a review
app.patch('/api/reviews/:id', authMiddleware, async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const { rating, comment } = req.body;
    
    // Check ownership
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating && { rating: Number(rating) }),
        ...(comment !== undefined && { comment }),
      },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a review
app.delete('/api/reviews/:id', authMiddleware, async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await prisma.review.delete({ where: { id: reviewId } });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

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
            reviews: { select: { rating: true } }
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
          ? w.listing.reviews.reduce((sum, r) => sum + r.rating, 0) / w.listing.reviews.length
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
