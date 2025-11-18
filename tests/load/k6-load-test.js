import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'],              // Error rate should be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Test data
const testUsers = Array.from({ length: 20 }, (_, i) => ({
  phoneNumber: `+155555${String(i).padStart(5, '0')}`,
  password: 'Test123!',
}));

export function setup() {
  console.log('Setting up load test...');
  console.log(`Target URL: ${BASE_URL}`);
}

export default function () {
  // Test scenario: User signup, signin, create rescue
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Health check
    testHealthCheck();
  } else if (scenario < 0.6) {
    // 30% - Sign in
    testSignIn();
  } else {
    // 40% - Create and track rescue
    testRescueFlow();
  }

  sleep(Math.random() * 3 + 1); // Random delay 1-4 seconds
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL.replace('/api/v1', '')}/health`);

  check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
}

function testSignIn() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  const payload = JSON.stringify({
    phoneNumber: user.phoneNumber,
    password: user.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/signin`, payload, params);

  check(res, {
    'signin status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'signin response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    return body.data?.accessToken;
  }

  return null;
}

function testRescueFlow() {
  // Sign in first
  const token = testSignIn();
  if (!token) return;

  // Create rescue
  const rescuePayload = JSON.stringify({
    pickupLocation: {
      address: '123 Main St, San Francisco, CA',
      latitude: 37.7749,
      longitude: -122.4194,
    },
    dropoffLocation: {
      address: '456 Market St, San Francisco, CA',
      latitude: 37.7849,
      longitude: -122.4094,
    },
    issue: {
      type: 'flat_tire',
      description: 'Flat tire on front wheel',
    },
    ebike: {
      make: 'Rad Power',
      model: 'RadRunner',
      color: 'Black',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const createRes = http.post(`${BASE_URL}/rescues`, rescuePayload, params);

  check(createRes, {
    'create rescue status is 201': (r) => r.status === 201,
    'create rescue response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  if (createRes.status === 201) {
    const body = JSON.parse(createRes.body);
    const rescueId = body.data?.rescue?.id;

    if (rescueId) {
      // Get rescue details
      sleep(0.5);
      const getRes = http.get(`${BASE_URL}/rescues/${rescueId}`, params);

      check(getRes, {
        'get rescue status is 200': (r) => r.status === 200,
        'get rescue response time < 300ms': (r) => r.timings.duration < 300,
      }) || errorRate.add(1);
    }
  }
}

export function teardown(data) {
  console.log('Load test completed');
}
