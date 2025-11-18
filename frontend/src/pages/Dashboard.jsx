import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              🚚 SupportCarr
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user?.firstName || 'User'}
              </span>
              <Link to="/profile" className="btn btn-outline">
                Profile
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Need a Rescue?</h2>
            <p className="text-gray-600 mb-4">
              Request a pickup truck to rescue you and your e-bike
            </p>
            <Link to="/rescue/new" className="btn btn-primary">
              Request Rescue
            </Link>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recent Rescues</h2>
            <p className="text-gray-500">No recent rescues</p>
          </div>
        </div>
      </div>
    </div>
  );
}
