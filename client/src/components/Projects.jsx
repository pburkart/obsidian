// client/src/components/Projects.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const verifyTokenAndFetchProjects = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        await axios.get('http://localhost:3000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const response = await axios.get('http://localhost:3000/api/projects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProjects(response.data);
      } catch (err) {
        console.error('Token verification or project fetch failed:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to fetch projects');
        localStorage.removeItem('token');
        navigate('/login');
      }
    };
    verifyTokenAndFetchProjects();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      let response;
      if (editId) {
        response = await axios.put(
          `http://localhost:3000/api/projects/${editId}`,
          { name, description },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProjects(projects.map((p) => (p.id === editId ? response.data : p)));
        setEditId(null);
      } else {
        response = await axios.post(
          'http://localhost:3000/api/projects',
          { name, description },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProjects([...projects, response.data]);
        navigate(`/projects/${response.data.id}`);
      }
      setName('');
      setDescription('');
      setShowForm(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    }
  };

  const handleEdit = (project) => {
    setEditId(project.id);
    setName(project.name);
    setDescription(project.description || '');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      await axios.delete(`http://localhost:3000/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(projects.filter((p) => (p.id !== id)));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete project');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-4">
	  <h2 className="text-3xl font-bold">Your Projects</h2>
	  <div className="space-x-4">
			<button
			  onClick={() => setShowForm(true)}
			  className="bg-[var(--obsidian-700)] text-white py-2 px-4 rounded hover:bg-[var(--obsidian-600)] transition"
			>
			  Create New Project
			</button>
			<button
			  onClick={() => {
				localStorage.removeItem('token');
				navigate('/login');
			  }}
			  className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition"
			>
			  Logout
			</button>
	  </div>
	</div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 max-w-md">
          <div className="mb-4">
            <label className="block text-[var(--obsidian-700)] mb-2" htmlFor="name">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
              placeholder="Enter project name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-[var(--obsidian-700)] mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
              placeholder="Enter project description"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="bg-[var(--obsidian-700)] text-white py-2 px-4 rounded hover:bg-[var(--obsidian-600)] transition"
            >
              {editId ? 'Update Project' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
                setName('');
                setDescription('');
              }}
              className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="grid gap-4 h-[calc(100vh-120px)] overflow-y-hidden">
		  {projects.map((project) => (
			<div
			  key={project.id}
			  className="bg-[var(--obsidian-800)] p-4 rounded-lg flex justify-between items-center max-w-md"
			>
			  <div className="flex-1">
				<h3
				  className="text-xl font-bold cursor-pointer hover:underline"
				  onClick={() => navigate(`/projects/${project.id}`)}
				>
				  {project.name}
				</h3>
				<p className="text-white mt-1 break-words">
				  {project.description || 'No description'}
				</p>
			  </div>
			  <div className="ml-4 space-x-2">
				<button
				  onClick={() => handleEdit(project)}
				  className="bg-[var(--obsidian-700)] text-white py-1 px-3 rounded hover:bg-[var(--obsidian-600)] transition"
				>
				  Edit
				</button>
				<button
				  onClick={() => handleDelete(project.id)}
				  className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 transition"
				>
				  Delete
				</button>
			  </div>
			</div>
		  ))}
		</div>
    </div>
  );
}

export default Projects;