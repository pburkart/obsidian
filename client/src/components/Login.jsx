// client/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/projects');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password,
      });
      localStorage.setItem('token', response.data.token);
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-[var(--obsidian-800)] p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Obsidian Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex items-center">
            <label className="text-white w-1/3" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-2/3 p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="mb-6 flex items-center">
            <label className="text-white w-1/3" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-2/3 p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[var(--obsidian-700)] text-white py-2 rounded hover:bg-[var(--obsidian-600)] transition"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-center">
          Don’t have an account?{' '}
          <Link to="/register" className="text-white hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;