import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-white text-2xl font-bold">🚚 SupportCarr</div>
            <div className="space-x-4">
              <Link to="/signin" className="text-white hover:text-primary-100">
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-white text-primary-600 px-6 py-2 rounded-lg font-medium hover:bg-primary-50"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Never Stranded Again
          </h1>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            On-demand rescue for your e-bike. Get picked up anywhere, anytime.
            Professional drivers with trucks ready to help.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            Request a Rescue
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl mb-4">📍</div>
            <h3 className="text-xl font-semibold mb-2">1. Request Pickup</h3>
            <p className="text-gray-600">
              Enter your location and destination. We'll find the nearest available driver.
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">🚗</div>
            <h3 className="text-xl font-semibold mb-2">2. Driver On The Way</h3>
            <p className="text-gray-600">
              Track your driver in real-time as they head to your location with their truck.
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-xl font-semibold mb-2">3. Safe Delivery</h3>
            <p className="text-gray-600">
              Your e-bike is loaded safely and delivered to your chosen destination.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gray-100 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why SupportCarr?</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">⚡</div>
              <div>
                <h3 className="font-semibold mb-2">Fast Response</h3>
                <p className="text-gray-600">
                  Average pickup time under 15 minutes in major cities
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-3xl">💰</div>
              <div>
                <h3 className="font-semibold mb-2">Transparent Pricing</h3>
                <p className="text-gray-600">
                  Know the cost upfront. No hidden fees or surge pricing.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="font-semibold mb-2">Secure & Insured</h3>
                <p className="text-gray-600">
                  All drivers are background-checked and fully insured
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-3xl">📱</div>
              <div>
                <h3 className="font-semibold mb-2">Real-Time Tracking</h3>
                <p className="text-gray-600">
                  Track your rescue from request to delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-xl text-gray-600 mb-8">
          Join thousands of riders who trust SupportCarr for roadside assistance
        </p>
        <div className="space-x-4">
          <Link
            to="/signup?role=rider"
            className="inline-block bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700"
          >
            I Need a Rescue
          </Link>
          <Link
            to="/signup?role=driver"
            className="inline-block bg-secondary-200 text-secondary-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-secondary-300"
          >
            Become a Driver
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">🚚 SupportCarr</div>
              <p className="text-gray-400">
                On-demand rescue for the micromobility generation
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Press</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Safety</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 SupportCarr. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
