// client/src/App.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        await axios.get('http://localhost:3000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        navigate('/projects');
      } catch (err) {
        console.error('Token verification failed:', err.response?.data || err.message);
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    verifyToken();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <header className="w-full flex justify-end p-4">
        <div className="space-x-4">
          <a
            href="/login"
            className="text-white py-2 px-4 rounded hover:bg-[var(--obsidian-700)] transition"
          >
            Login
          </a>
          <a
            href="/register"
            className="text-white py-2 px-4 rounded hover:bg-[var(--obsidian-700)] transition"
          >
            Register
          </a>
        </div>
      </header>
      <div className="text-center mt-16">
        <h1 className="text-4xl font-bold mb-4">Welcome to Obsidian</h1>
        <p className="text-[var(--obsidian-700)]">
          A lightweight project management board
        </p>
      </div>
    </div>
  );
}

export default App;