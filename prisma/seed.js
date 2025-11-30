const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create users
  const hostPassword = bcrypt.hashSync('hostpass123', 10);
  const guestPassword = bcrypt.hashSync('guestpass123', 10);
  const guest2Password = bcrypt.hashSync('guest2pass123', 10);

  const host = await prisma.user.upsert({
    where: { email: 'host@luxora.dev' },
    update: { passwordHash: hostPassword, isVerified: true, isSuperhost: true, role: 'HOST' },
    create: { 
      name: 'Luxora Host', 
      email: 'host@luxora.dev', 
      passwordHash: hostPassword,
      role: 'HOST',
      bio: 'Experienced host with 5+ years of hosting travelers from around the world.',
      phone: '+1-555-0100',
      isVerified: true,
      isSuperhost: true
    },
  });

  const guest = await prisma.user.upsert({
    where: { email: 'guest@luxora.dev' },
    update: { passwordHash: guestPassword, role: 'GUEST' },
    create: { 
      name: 'Luxora Guest', 
      email: 'guest@luxora.dev', 
      passwordHash: guestPassword,
      role: 'GUEST',
      bio: 'Travel enthusiast exploring new cities.',
      phone: '+1-555-0101'
    },
  });

  const guest2 = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: { passwordHash: guest2Password, role: 'GUEST' },
    create: { 
      name: 'Sarah Johnson', 
      email: 'sarah@example.com', 
      passwordHash: guest2Password,
      role: 'GUEST',
      bio: 'Digital nomad working remotely.',
      phone: '+1-555-0102'
    },
  });

  console.log('✅ Users created');

  // Create amenities
  const amenitiesData = [
    { name: 'WiFi', icon: '📶', category: 'Essential' },
    { name: 'Kitchen', icon: '🍳', category: 'Kitchen' },
    { name: 'Washer', icon: '🧺', category: 'Essential' },
    { name: 'Dryer', icon: '🌪️', category: 'Essential' },
    { name: 'Air conditioning', icon: '❄️', category: 'Comfort' },
    { name: 'Heating', icon: '🔥', category: 'Comfort' },
    { name: 'TV', icon: '📺', category: 'Entertainment' },
    { name: 'Pool', icon: '🏊', category: 'Outdoor' },
    { name: 'Hot tub', icon: '🛁', category: 'Comfort' },
    { name: 'Free parking', icon: '🚗', category: 'Essential' },
    { name: 'Gym', icon: '💪', category: 'Facilities' },
    { name: 'Workspace', icon: '💻', category: 'Essential' },
    { name: 'Smoke alarm', icon: '🚨', category: 'Safety' },
    { name: 'Fire extinguisher', icon: '🧯', category: 'Safety' },
    { name: 'First aid kit', icon: '🏥', category: 'Safety' },
    { name: 'Pet friendly', icon: '🐶', category: 'General' },
  ];

  const amenities = {};
  for (const amenityData of amenitiesData) {
    const amenity = await prisma.amenity.upsert({
      where: { name: amenityData.name },
      update: amenityData,
      create: amenityData,
    });
    amenities[amenityData.name] = amenity;
  }

  console.log('✅ Amenities created');

  // Create listings
  const listingsData = [
    {
      title: 'Cozy apartment in downtown',
      description: 'Bright 1BR apartment near cafes and transit. Perfect for solo travelers or couples. Walking distance to major attractions.',
      city: 'San Francisco',
      country: 'USA',
      address: '123 Market St',
      price: 120,
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      baseGuests: 2,
      extraGuestFee: 0,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      instantBookEnabled: true,
      amenities: ['WiFi', 'Kitchen', 'Washer', 'Air conditioning', 'Workspace', 'Smoke alarm']
    },
    {
      title: 'Stylish studio near the beach',
      description: 'Compact studio with ocean views. Modern design with all essentials. Steps from the beach and boardwalk.',
      city: 'Santa Monica',
      country: 'USA',
      address: '456 Ocean Ave',
      price: 150,
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      baseGuests: 2,
      extraGuestFee: 0,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
      roomType: 'PRIVATE_ROOM',
      hostId: host.id,
      amenities: ['WiFi', 'Kitchen', 'Air conditioning', 'TV', 'Free parking', 'Smoke alarm']
    },
    {
      title: 'Mountain cabin retreat',
      description: 'Rustic cabin surrounded by trees. Peaceful getaway with modern amenities. Hot tub on the deck with mountain views.',
      city: 'Big Bear',
      country: 'USA',
      address: '789 Pine Ridge Rd',
      price: 200,
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      baseGuests: 2,
      extraGuestFee: 25,
      image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      instantBookEnabled: true,
      amenities: ['WiFi', 'Kitchen', 'Washer', 'Dryer', 'Heating', 'Hot tub', 'Free parking', 'Fire extinguisher']
    },
    {
      title: 'Modern loft in arts district',
      description: 'Industrial-chic loft with exposed brick and high ceilings. Located in vibrant arts district with galleries and restaurants.',
      city: 'Los Angeles',
      country: 'USA',
      address: '321 Arts St',
      price: 180,
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      baseGuests: 2,
      extraGuestFee: 20,
      image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      amenities: ['WiFi', 'Kitchen', 'Washer', 'Air conditioning', 'TV', 'Workspace', 'Gym', 'Smoke alarm']
    },
    {
      title: 'Charming townhouse near city center',
      description: 'Spacious 3BR townhouse with a private patio, perfect for families. Close to museums and parks.',
      city: 'Boston',
      country: 'USA',
      address: '12 Beacon Way',
      price: 220,
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      baseGuests: 4,
      extraGuestFee: 30,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      amenities: ['WiFi', 'Kitchen', 'Washer', 'Dryer', 'Heating', 'Free parking', 'Smoke alarm', 'First aid kit']
    },
    {
      title: 'Beachfront villa with pool',
      description: 'Luxury 4BR villa right on the beach with an infinity pool and outdoor dining area.',
      city: 'Miami',
      country: 'USA',
      address: '88 Shoreline Dr',
      price: 450,
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 8,
      baseGuests: 4,
      extraGuestFee: 50,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      instantBookEnabled: true,
      amenities: ['WiFi', 'Kitchen', 'Air conditioning', 'Pool', 'TV', 'Free parking', 'Smoke alarm']
    },
    {
      title: 'City view high-rise apartment',
      description: 'Modern 2BR apartment on the 25th floor with stunning skyline views and a gym in the building.',
      city: 'Chicago',
      country: 'USA',
      address: '2500 Skyline Blvd',
      price: 210,
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      baseGuests: 2,
      extraGuestFee: 25,
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      amenities: ['WiFi', 'Kitchen', 'Air conditioning', 'Gym', 'Workspace', 'Smoke alarm']
    },
    {
      title: 'Countryside cottage getaway',
      description: 'Quaint cottage surrounded by fields and nature. Ideal for a peaceful retreat.',
      city: 'Napa',
      country: 'USA',
      address: '7 Vineyard Lane',
      price: 160,
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      baseGuests: 2,
      extraGuestFee: 20,
      image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      amenities: ['WiFi', 'Kitchen', 'Heating', 'Free parking', 'First aid kit', 'Fire extinguisher']
    },
    {
      title: 'Sleek penthouse with rooftop',
      description: 'Upscale penthouse featuring a private rooftop terrace and a dedicated workspace.',
      city: 'New York',
      country: 'USA',
      address: '901 Madison Ave',
      price: 500,
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      baseGuests: 2,
      extraGuestFee: 75,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      amenities: ['WiFi', 'Kitchen', 'Air conditioning', 'Workspace', 'TV', 'Smoke alarm']
    },
    {
      title: 'Lake house with hot tub',
      description: 'Beautiful lakefront property with a deck, hot tub, and kayaks available for guests.',
      city: 'Lake Tahoe',
      country: 'USA',
      address: '44 Lakeshore Ct',
      price: 300,
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      baseGuests: 4,
      extraGuestFee: 35,
      image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400',
      roomType: 'ENTIRE_PLACE',
      hostId: host.id,
      amenities: ['WiFi', 'Kitchen', 'Washer', 'Dryer', 'Heating', 'Hot tub', 'Free parking', 'Fire extinguisher']
    }
  ];

  const createdListings = [];
  for (const listingData of listingsData) {
    const { amenities: listingAmenities, ...listingInfo } = listingData;
    // Find by non-unique title and update if exists, else create
    const existing = await prisma.listing.findFirst({ where: { title: listingData.title } });
    const listing = existing
      ? await prisma.listing.update({ where: { id: existing.id }, data: listingInfo })
      : await prisma.listing.create({ data: listingInfo });

    // Reset amenities for idempotent seeding, then add fresh
    await prisma.listingAmenity.deleteMany({ where: { listingId: listing.id } });
    for (const amenityName of listingAmenities) {
      await prisma.listingAmenity.create({
        data: {
          listingId: listing.id,
          amenityId: amenities[amenityName].id,
        },
      });
    }

    // Add pet friendly amenity to every 3rd listing for testing (heuristic for filter)
    if (listing.id % 3 === 0 && amenities['Pet friendly']) {
      await prisma.listingAmenity.create({
        data: { listingId: listing.id, amenityId: amenities['Pet friendly'].id }
      });
    }

    createdListings.push(listing);
  }

  console.log('✅ Listings created with amenities');

  // Create bookings
  const bookingsCount = await prisma.booking.count();
  let booking1, booking2;
  if (bookingsCount === 0 && createdListings.length > 0) {
    booking1 = await prisma.booking.create({
      data: {
        listingId: createdListings[0].id,
        userId: guest.id,
        checkIn: new Date('2025-12-15'),
        checkOut: new Date('2025-12-18'),
        totalPrice: createdListings[0].price * 3,
        guests: 2,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    });

    booking2 = await prisma.booking.create({
      data: {
        listingId: createdListings[2].id,
        userId: guest2.id,
        checkIn: new Date('2025-12-20'),
        checkOut: new Date('2025-12-25'),
        totalPrice: createdListings[2].price * 5,
        guests: 3,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
      },
    });

    console.log('✅ Bookings created');
  }

  // Create reviews
  const reviewsCount = await prisma.review.count();
  if (reviewsCount === 0 && createdListings.length > 0) {
    if (booking1) {
      await prisma.review.create({
        data: {
          bookingId: booking1.id,
          listingId: createdListings[0].id,
          userId: guest.id,
          overallRating: 5,
          comment: 'Amazing place! Perfect location and very clean. Host was super responsive and helpful.',
        },
      });
    }

    await prisma.review.create({
      data: {
        // For a listing without a booking link, create a booking to satisfy schema
        booking: {
          create: {
            listingId: createdListings[1].id,
            userId: guest2.id,
            checkIn: new Date('2025-12-10'),
            checkOut: new Date('2025-12-12'),
            totalPrice: createdListings[1].price * 2,
            guests: 2,
            status: 'COMPLETED',
            paymentStatus: 'PAID',
          },
        },
        listing: { connect: { id: createdListings[1].id } },
        user: { connect: { id: guest2.id } },
        userId: guest2.id,
        overallRating: 4,
        comment: 'Great ocean views and comfortable bed. Would definitely stay again!',
      },
    });

    if (booking2) {
      await prisma.review.create({
        data: {
          bookingId: booking2.id,
          listingId: createdListings[2].id,
          userId: guest.id,
          overallRating: 5,
          comment: 'The cabin was exactly as described. Hot tub was incredible. So peaceful and relaxing.',
        },
      });
    }

    console.log('✅ Reviews created');
  }

  // Create wishlists
  const wishlistCount = await prisma.wishlist.count();
  if (wishlistCount === 0 && createdListings.length > 0) {
    await prisma.wishlist.create({
      data: {
        userId: guest.id,
        listingId: createdListings[1].id,
      },
    });

    await prisma.wishlist.create({
      data: {
        userId: guest.id,
        listingId: createdListings[3].id,
      },
    });

    await prisma.wishlist.create({
      data: {
        userId: guest2.id,
        listingId: createdListings[0].id,
      },
    });

    console.log('✅ Wishlists created');
  }

  // Create messages
  const messagesCount = await prisma.message.count();
  if (messagesCount === 0 && createdListings.length > 0) {
    await prisma.message.create({
      data: {
        senderId: guest.id,
        receiverId: host.id,
        listingId: createdListings[0].id,
        content: 'Hi! Is your place available for the dates Dec 15-18?',
        read: true,
      },
    });

    await prisma.message.create({
      data: {
        senderId: host.id,
        receiverId: guest.id,
        listingId: createdListings[0].id,
        content: 'Yes, it\'s available! Feel free to book.',
        read: true,
      },
    });

    await prisma.message.create({
      data: {
        senderId: guest2.id,
        receiverId: host.id,
        listingId: createdListings[2].id,
        content: 'Does the cabin have firewood for the fireplace?',
        read: false,
      },
    });

    console.log('✅ Messages created');
  }

  console.log('🎉 Seed complete! Database is ready.');
  console.log('\nTest credentials:');
  console.log('  Host: host@luxora.dev / hostpass123');
  console.log('  Guest 1: guest@luxora.dev / guestpass123');
  console.log('  Guest 2: sarah@example.com / guest2pass123');
  console.log('\nFeature flags: Added Pet friendly amenity and assigned to subset of listings for filter testing.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
