import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button, Card, Badge } from '@/components/ui';
import { Container } from '@/components/layout';

/**
 * Home/Landing Page
 *
 * Public landing page for SupportCarr
 */
export const Home: React.FC = () => {
  const { isAuthenticated, profile } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">SupportCarr</span>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated && profile ? (
                <Link
                  to={
                    profile.role === 'rider'
                      ? '/rider/dashboard'
                      : '/driver/dashboard'
                  }
                >
                  <Button variant="primary">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/signin">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="primary">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <Container>
          <div className="text-center">
            <Badge variant="primary" size="md" className="mb-6">
              Production-Grade E-Bike Rescue Platform
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
              E-Bike Rescue,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                When You Need It Most
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
              Get immediate roadside assistance for your e-bike. Dead battery? Flat
              tire? Mechanical issue? We've got you covered.
            </p>

            <div className="mt-10 flex justify-center gap-4">
              {!isAuthenticated && (
                <>
                  <Link to="/signup">
                    <Button size="lg" variant="primary">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/signin">
                    <Button size="lg" variant="outline">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <Container>
          <div className="grid gap-8 md:grid-cols-3">
            <Card variant="elevated" padding="lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Fast Response</h3>
              <p className="mt-2 text-gray-600">
                Get matched with nearby drivers in minutes. Real-time tracking keeps
                you informed.
              </p>
            </Card>

            <Card variant="elevated" padding="lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Safe & Secure</h3>
              <p className="mt-2 text-gray-600">
                All drivers are verified. Encrypted payments and data protection for
                your peace of mind.
              </p>
            </Card>

            <Card variant="elevated" padding="lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Transparent Pricing
              </h3>
              <p className="mt-2 text-gray-600">
                Know the cost upfront. No hidden fees. Pay securely through the app.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <Container>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How It Works
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              { step: '1', title: 'Request', desc: 'Describe your issue and location' },
              { step: '2', title: 'Match', desc: 'Get matched with a nearby driver' },
              { step: '3', title: 'Track', desc: 'Real-time updates on driver location' },
              { step: '4', title: 'Resolve', desc: 'Get back on the road quickly' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <Container>
          <div className="py-8 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SupportCarr. All rights reserved.
          </div>
        </Container>
      </footer>
    </div>
  );
};

Home.displayName = 'Home';
