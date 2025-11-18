import { faker } from '@faker-js/faker';
import database from '../config/database.js';
import logger from '../utils/logger.js';
import {
  User,
  DriverProfile,
  Vehicle,
  RiderProfile,
  RescueRequest,
  PaymentRecord,
  Rating,
  PromoCode,
  Referral,
} from '../models/index.js';

/**
 * Seed database with sample data
 */
async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Connect to database
    await database.connect();

    // Clear existing data
    if (process.env.NODE_ENV !== 'production') {
      await clearDatabase();
    }

    // Seed data
    const users = await seedUsers();
    const { riders, drivers } = await seedProfiles(users);
    const vehicles = await seedVehicles(drivers);
    const rescues = await seedRescues(riders, drivers);
    await seedPayments(rescues);
    await seedRatings(rescues);
    await seedPromoCodes();
    await seedReferrals(users);

    logger.info('Database seeding completed successfully!');
    logger.info('Summary:', {
      users: users.length,
      riders: riders.length,
      drivers: drivers.length,
      vehicles: vehicles.length,
      rescues: rescues.length,
    });

    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

/**
 * Clear existing data
 */
async function clearDatabase() {
  logger.info('Clearing existing data...');

  await Promise.all([
    User.deleteMany({}),
    DriverProfile.deleteMany({}),
    Vehicle.deleteMany({}),
    RiderProfile.deleteMany({}),
    RescueRequest.deleteMany({}),
    PaymentRecord.deleteMany({}),
    Rating.deleteMany({}),
    PromoCode.deleteMany({}),
    Referral.deleteMany({}),
  ]);

  logger.info('Database cleared');
}

/**
 * Seed users
 */
async function seedUsers() {
  logger.info('Seeding users...');

  const users = [];

  // Create admin user
  users.push(
    await User.create({
      phoneNumber: '+15555550001',
      password: 'Admin123!',
      email: 'admin@supportcarr.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isPhoneVerified: true,
      isEmailVerified: true,
    })
  );

  // Create 20 riders
  for (let i = 0; i < 20; i++) {
    users.push(
      await User.create({
        phoneNumber: faker.phone.number('+1##########'),
        password: 'Password123!',
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'rider',
        isPhoneVerified: true,
        avatar: faker.image.avatar(),
      })
    );
  }

  // Create 10 drivers
  for (let i = 0; i < 10; i++) {
    users.push(
      await User.create({
        phoneNumber: faker.phone.number('+1##########'),
        password: 'Password123!',
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'driver',
        isPhoneVerified: true,
        avatar: faker.image.avatar(),
      })
    );
  }

  logger.info(`Created ${users.length} users`);
  return users;
}

/**
 * Seed profiles
 */
async function seedProfiles(users) {
  logger.info('Seeding profiles...');

  const riders = [];
  const drivers = [];

  for (const user of users) {
    if (user.role === 'rider') {
      const riderProfile = await RiderProfile.create({
        userId: user._id,
        savedLocations: [
          {
            label: 'home',
            address: faker.location.streetAddress(true),
            location: {
              type: 'Point',
              coordinates: [
                faker.location.longitude({ min: -122.5, max: -122.3 }),
                faker.location.latitude({ min: 37.7, max: 37.9 }),
              ],
            },
          },
        ],
        ebikes: [
          {
            make: faker.helpers.arrayElement(['Rad Power', 'Super73', 'Trek', 'Aventon']),
            model: faker.vehicle.model(),
            color: faker.color.human(),
            isPrimary: true,
          },
        ],
      });
      riders.push(riderProfile);
    } else if (user.role === 'driver') {
      const driverProfile = await DriverProfile.create({
        userId: user._id,
        licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
        licenseState: 'CA',
        licenseExpiryDate: faker.date.future({ years: 2 }),
        backgroundCheckStatus: 'approved',
        backgroundCheckDate: faker.date.past(),
        currentLocation: {
          type: 'Point',
          coordinates: [
            faker.location.longitude({ min: -122.5, max: -122.3 }),
            faker.location.latitude({ min: 37.7, max: 37.9 }),
          ],
        },
        isAvailable: faker.datatype.boolean(),
        rating: {
          average: faker.number.float({ min: 4, max: 5, precision: 0.1 }),
          count: faker.number.int({ min: 10, max: 100 }),
        },
        stats: {
          totalRescues: faker.number.int({ min: 50, max: 500 }),
          completionRate: faker.number.float({ min: 85, max: 100, precision: 0.1 }),
          totalEarnings: faker.number.float({ min: 1000, max: 10000, precision: 0.01 }),
        },
        approvedAt: faker.date.past(),
      });
      drivers.push(driverProfile);
    }
  }

  logger.info(`Created ${riders.length} rider profiles and ${drivers.length} driver profiles`);
  return { riders, drivers };
}

/**
 * Seed vehicles
 */
async function seedVehicles(drivers) {
  logger.info('Seeding vehicles...');

  const vehicles = [];

  for (const driver of drivers) {
    const vehicle = await Vehicle.create({
      driverId: driver._id,
      make: faker.helpers.arrayElement(['Ford', 'Toyota', 'Chevrolet', 'Tesla', 'Rivian']),
      model: faker.helpers.arrayElement(['F-150', 'Tacoma', 'Silverado', 'Cybertruck', 'R1T']),
      year: faker.number.int({ min: 2015, max: 2024 }),
      color: faker.color.human(),
      licensePlate: faker.string.alphanumeric(7).toUpperCase(),
      licensePlateState: 'CA',
      type: 'pickup_truck',
      bedLength: faker.helpers.arrayElement([60, 72, 84]),
      capacity: {
        weight: faker.number.int({ min: 1000, max: 2000 }),
      },
      verificationStatus: 'verified',
      verifiedAt: faker.date.past(),
    });
    vehicles.push(vehicle);

    // Update driver with vehicle
    driver.vehicleId = vehicle._id;
    await driver.save();
  }

  logger.info(`Created ${vehicles.length} vehicles`);
  return vehicles;
}

/**
 * Seed rescues
 */
async function seedRescues(riders, drivers) {
  logger.info('Seeding rescues...');

  const rescues = [];
  const statuses = [
    'completed',
    'completed',
    'completed',
    'in_progress',
    'driver_enroute',
    'accepted',
    'pending',
  ];

  for (let i = 0; i < 50; i++) {
    const rider = faker.helpers.arrayElement(riders);
    const driver = faker.helpers.arrayElement(drivers);
    const status = faker.helpers.arrayElement(statuses);

    const pickupCoords = [
      faker.location.longitude({ min: -122.5, max: -122.3 }),
      faker.location.latitude({ min: 37.7, max: 37.9 }),
    ];

    const dropoffCoords = [
      faker.location.longitude({ min: -122.5, max: -122.3 }),
      faker.location.latitude({ min: 37.7, max: 37.9 }),
    ];

    const basePrice = 25;
    const distancePrice = faker.number.float({ min: 5, max: 30, precision: 0.5 });
    const total = basePrice + distancePrice;
    const platformFee = total * 0.2;
    const driverPayout = total - platformFee;

    const rescue = await RescueRequest.create({
      riderId: rider.userId,
      driverId: status !== 'pending' ? driver.userId : null,
      status,
      pickupLocation: {
        address: faker.location.streetAddress(true),
        location: {
          type: 'Point',
          coordinates: pickupCoords,
        },
      },
      dropoffLocation: {
        address: faker.location.streetAddress(true),
        location: {
          type: 'Point',
          coordinates: dropoffCoords,
        },
      },
      ebike: {
        make: faker.helpers.arrayElement(['Rad Power', 'Super73', 'Trek']),
        model: faker.vehicle.model(),
        color: faker.color.human(),
      },
      issue: {
        type: faker.helpers.arrayElement([
          'flat_tire',
          'dead_battery',
          'mechanical_failure',
          'accident',
        ]),
        description: faker.lorem.sentence(),
      },
      pricing: {
        basePrice,
        distancePrice,
        surgeMultiplier: 1.0,
        subtotal: total,
        platformFee,
        total,
        driverPayout,
      },
      distance: {
        estimated: faker.number.float({ min: 2, max: 30, precision: 0.1 }),
      },
      createdAt: faker.date.past({ years: 0.5 }),
      acceptedAt: status !== 'pending' ? faker.date.recent() : null,
      completedAt: status === 'completed' ? faker.date.recent() : null,
    });

    rescues.push(rescue);
  }

  logger.info(`Created ${rescues.length} rescues`);
  return rescues;
}

/**
 * Seed payments
 */
async function seedPayments(rescues) {
  logger.info('Seeding payments...');

  for (const rescue of rescues) {
    if (rescue.status === 'completed') {
      await PaymentRecord.create({
        rescueRequestId: rescue._id,
        riderId: rescue.riderId,
        driverId: rescue.driverId,
        type: 'charge',
        status: 'succeeded',
        amount: rescue.pricing.total,
        currency: 'USD',
        paymentMethod: 'card',
        breakdown: {
          subtotal: rescue.pricing.subtotal,
          platformFee: rescue.pricing.platformFee,
          total: rescue.pricing.total,
        },
        processedAt: rescue.completedAt,
      });
    }
  }

  logger.info('Payments created');
}

/**
 * Seed ratings
 */
async function seedRatings(rescues) {
  logger.info('Seeding ratings...');

  for (const rescue of rescues) {
    if (rescue.status === 'completed' && rescue.driverId) {
      // Rider rates driver
      await Rating.create({
        rescueRequestId: rescue._id,
        fromUserId: rescue.riderId,
        toUserId: rescue.driverId,
        score: faker.number.int({ min: 4, max: 5 }),
        feedback: faker.helpers.arrayElement([
          'Great driver, very professional!',
          'Quick and efficient service',
          'Friendly and helpful',
          'Smooth ride, would use again',
          null,
        ]),
        tags: faker.helpers.arrayElements(
          ['professional', 'friendly', 'on_time', 'careful', 'helpful'],
          faker.number.int({ min: 1, max: 3 })
        ),
      });

      // Driver rates rider
      if (faker.datatype.boolean(0.7)) {
        await Rating.create({
          rescueRequestId: rescue._id,
          fromUserId: rescue.driverId,
          toUserId: rescue.riderId,
          score: faker.number.int({ min: 4, max: 5 }),
          feedback: faker.helpers.arrayElement([
            'Great rider, easy pickup',
            'Respectful and patient',
            'Clear communication',
            null,
          ]),
        });
      }
    }
  }

  logger.info('Ratings created');
}

/**
 * Seed promo codes
 */
async function seedPromoCodes() {
  logger.info('Seeding promo codes...');

  await PromoCode.create([
    {
      code: 'WELCOME10',
      type: 'fixed_amount',
      discountValue: 10,
      usageLimit: { total: 1000, perUser: 1 },
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      applicableFor: 'first_time_only',
    },
    {
      code: 'SAVE20',
      type: 'percentage',
      discountValue: 20,
      maxDiscount: 15,
      usageLimit: { total: null, perUser: 3 },
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      code: 'FREERIDE',
      type: 'percentage',
      discountValue: 100,
      maxDiscount: 50,
      usageLimit: { total: 100, perUser: 1 },
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ]);

  logger.info('Promo codes created');
}

/**
 * Seed referrals
 */
async function seedReferrals(users) {
  logger.info('Seeding referrals...');

  for (const user of users.slice(0, 10)) {
    await Referral.createForUser(user._id);
  }

  logger.info('Referrals created');
}

// Run seed
seedDatabase();
