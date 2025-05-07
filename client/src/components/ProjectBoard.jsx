// client/src/components/ProjectBoard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Modal from 'react-modal';

Modal.setAppElement('#root');

function ProjectBoard() {
  const { project_id } = useParams();
  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([]);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingRowName, setEditingRowName] = useState('');
  const [newWorkItem, setNewWorkItem] = useState({ rowId: null, title: '', description: '' });
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        const response = await axios.get(`http://localhost:3000/api/projects/${project_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched project:', response.data);
        setProject(response.data);
        setRows(response.data.rows || []);
      } catch (err) {
        console.error('Fetch project error:', err);
        setError(err.response?.data?.error || 'Failed to fetch project');
        navigate('/login');
      }
    };
    fetchProject();
  }, [project_id, navigate]);

  const handleCreateRow = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:3000/api/projects/${project_id}/rows`,
        { name: 'New Row' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows([...rows, response.data]);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create row');
    }
  };

  const handleEditRow = (row) => {
    setEditingRowId(row.id);
    setEditingRowName(row.name);
  };

  const handleSaveRow = async (rowId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3000/api/rows/${rowId}`,
        { name: editingRowName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(rows.map((row) => (row.id === rowId ? response.data : row)));
      setEditingRowId(null);
      setEditingRowName('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update row');
    }
  };

	const handleCreateWorkItem = async (rowId) => {
	  try {
		const token = localStorage.getItem('token');
		// Verify the row exists in the backend
		const rowResponse = await axios.get(`http://localhost:3000/api/rows/${rowId}`, {
		  headers: { Authorization: `Bearer ${token}` },
		});
		if (!rowResponse.data) {
		  throw new Error('Row not found');
		}

		const response = await axios.post(
		  `http://localhost:3000/api/rows/${rowId}/work-items`,
		  { title: newWorkItem.title, description: newWorkItem.description },
		  { headers: { Authorization: `Bearer ${token}` } }
		);
		console.log('Created work item:', response.data); // Debug log

		setRows(
		  rows.map((row) =>
			row.id === rowId ? { ...row, workItems: [...(row.workItems || []), response.data] } : row
		  )
		);
		setNewWorkItem({ rowId: null, title: '', description: '' });
		setError('');
	  } catch (err) {
		console.error('Error creating work item:', err.response?.data || err.message); // Debug log
		setError(err.response?.data?.error || err.message || 'Failed to create work item');
		// Revert the state if creation fails
		setRows(
		  rows.map((row) =>
			row.id === rowId ? { ...row, workItems: row.workItems || [] } : row
		  )
		);
	  }
	};

  const openWorkItem = async (workItemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/work-items/${workItemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched work item:', response.data);
      setSelectedWorkItem(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch work item');
    }
  };

  const handleUpdateWorkItem = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3000/api/work-items/${selectedWorkItem.id}`,
        { title: selectedWorkItem.title, description: selectedWorkItem.description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(
        rows.map((row) => ({
          ...row,
          workItems: row.workItems.map((wi) => (wi.id === selectedWorkItem.id ? response.data : wi)),
        }))
      );
      setSelectedWorkItem(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update work item');
    }
  };

  const handleAddComment = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3000/api/work-items/${selectedWorkItem.id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const response = await axios.get(`http://localhost:3000/api/work-items/${selectedWorkItem.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedWorkItem(response.data);
      setNewComment('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add comment');
    }
  };
	
  const handleUploadFile = async () => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', newFile);
      const response = await axios.post(
        `http://localhost:3000/api/work-items/${selectedWorkItem.id}/files`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      setSelectedWorkItem({
        ...selectedWorkItem,
        files: [...selectedWorkItem.files, response.data],
      });
      setNewFile(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file');
    }
  };

  const onDragEnd = async (result) => {
  const { source, destination } = result;
  if (!destination) return;

  console.log('onDragEnd - Source:', source.droppableId, 'Destination:', destination.droppableId);
  console.log('Current rows:', rows.map(row => ({ id: row.id, workItems: row.workItems })));

  const sourceRow = rows.find((row) => row.id.toString() === source.droppableId);
  const destRow = rows.find((row) => row.id.toString() === destination.droppableId);

  if (!sourceRow || !destRow) {
    console.warn(
      'Droppable not found:',
      !sourceRow ? `Source row ${source.droppableId}` : `Destination row ${destination.droppableId}`
    );
    return;
  }

  const [movedItem] = sourceRow.workItems.splice(source.index, 1);
  const sourceWorkItemsBefore = [...sourceRow.workItems];
  const destWorkItemsBefore = [...destRow.workItems];

  if (sourceRow.id === destRow.id) {
    sourceRow.workItems.splice(destination.index, 0, movedItem);
    setRows([...rows]);
  } else {
    destRow.workItems.splice(destination.index, 0, { ...movedItem, rowId: destRow.id });
    try {
      const token = localStorage.getItem('token');
      console.log(`Updating work item ${movedItem.id} to row ${destRow.id}`);
      console.log('Request payload:', { title: movedItem.title, description: movedItem.description, rowId: destRow.id });
      const response = await axios.put(
        `http://localhost:3000/api/work-items/${movedItem.id}`,
        { title: movedItem.title, description: movedItem.description, rowId: destRow.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Backend update successful:', response.data);

      // Verify the response has the updated rowId
      if (response.data.rowId !== destRow.id) {
        console.error(`Backend did not update rowId: expected ${destRow.id}, got ${response.data.rowId}`);
        setError('Failed to update work item position');
        // Revert the move on the frontend
        sourceRow.workItems.splice(source.index, 0, movedItem);
        destRow.workItems.splice(destination.index, 1);
        sourceRow.workItems = sourceWorkItemsBefore;
        destRow.workItems = destWorkItemsBefore;
      } else {
        // Update frontend state with the response
        setRows([...rows]);
      }
    } catch (err) {
      console.error('Failed to update work item on backend:', err.response?.data || err.message);
      console.error('Error details:', err.response?.status, err.response?.headers);
      setError(err.response?.data?.error || 'Failed to move work item');

      // Revert the move on the frontend
      sourceRow.workItems.splice(source.index, 0, movedItem);
      destRow.workItems.splice(destination.index, 1);
      sourceRow.workItems = sourceWorkItemsBefore;
      destRow.workItems = destWorkItemsBefore;
      setRows([...rows]);
    }
  }
};
	  
	const handleDeleteRow = async (rowId) => {
	  try {
		const token = localStorage.getItem('token');
		await axios.delete(`http://localhost:3000/api/rows/${rowId}`, {
		  headers: { Authorization: `Bearer ${token}` },
		});
		// Update state to remove the row and ensure no stale references
		setRows((prevRows) => prevRows.filter((row) => row.id !== rowId));
		setNewWorkItem({ rowId: null, title: '', description: '' }); // Reset form to prevent stale rowId
		setError('');
	  } catch (err) {
		console.error('Error deleting row:', err.response?.data || err.message);
		setError(err.response?.data?.error || 'Failed to delete row');
	  }
	};
	
	const handleDeleteWorkItem = async (workItemId, rowId) => {
	  try {
		const token = localStorage.getItem('token');
		await axios.delete(`http://localhost:3000/api/work-items/${workItemId}`, {
		  headers: { Authorization: `Bearer ${token}` },
		});
		setRows(
		  rows.map((row) =>
			row.id === rowId ? { ...row, workItems: row.workItems.filter((wi) => wi.id !== workItemId) } : row
		  )
		);
		if (selectedWorkItem && selectedWorkItem.id === workItemId) {
		  setSelectedWorkItem(null);
		}
		setError('');
	  } catch (err) {
		setError(err.response?.data?.error || 'Failed to delete work item');
	  }
	};

  if (!project) {
    return <div className="min-h-screen p-8 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-4">
		  <div className="flex justify-between items-center">
			<Link to="/projects" className="text-white hover:underline block">
			  Back to Projects
			</Link>
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
		  <div className="flex justify-between items-center mt-2">
			<h2 className="text-3xl font-bold">{project?.name || 'Project'}</h2>
			<button
			  onClick={handleCreateRow}
			  className="bg-[var(--obsidian-700)] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--obsidian-600)] transition"
			>
			  +
			</button>
		  </div>
		</div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <DragDropContext key={rows.map(row => row.id).join('-')} onDragEnd={onDragEnd}>
		  <div className="flex test space-x-4 overflow-x-auto pb-4">
			{rows.map((row) => (
			  <div key={row.id} className="min-w-[250px] flex-shrink-0 group">
				{editingRowId === row.id ? (
				  <input
					type="text"
					value={editingRowName}
					onChange={(e) => setEditingRowName(e.target.value)}
					onBlur={() => handleSaveRow(row.id)}
					autoFocus
					className="text-xl font-bold mb-4 bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-500)] rounded p-1 w-full"
				  />
				) : (
				  <h3
					className="text-xl font-bold mb-4 cursor-pointer hover:underline"
					onClick={() => handleEditRow(row)}
				  >
					{row.name}
				  </h3>
				)}
				<Droppable droppableId={row.id.toString()}>
				  {(provided) => (
					<div
					  {...provided.droppableProps}
					  ref={provided.innerRef}
					  className="bg-[var(--obsidian-800)] p-6 rounded-lg min-h-[200px]"
					>
					  {(row.workItems || []).map((workItem, index) => (
						<Draggable
						  key={`work-item-${workItem.id}`}
						  draggableId={`work-item-${workItem.id}`}
						  index={index}
						>
						  {(provided) => (
							<div
							  ref={provided.innerRef}
							  {...provided.draggableProps}
							  {...provided.dragHandleProps}
							  className="bg-[var(--obsidian-700)] rounded mb-2 cursor-pointer flex items-center justify-between group/item px-3 py-2"
							  onClick={() => openWorkItem(workItem.id)}
							>
							  <h4 className="font-bold text-sm flex-1">{workItem.title}</h4>
							  <button
								onClick={(e) => {
								  e.stopPropagation();
								  handleDeleteWorkItem(workItem.id, row.id);
								}}
								className="opacity-0 group-hover/item:opacity-100 transition-opacity"
							  >
								<svg
								  xmlns="http://www.w3.org/2000/svg"
								  className="h-4 w-4 text-black hover:text-gray-700"
								  fill="none"
								  viewBox="0 0 24 24"
								  stroke="currentColor"
								>
								  <path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								  />
								</svg>
							  </button>
							</div>
						  )}
						</Draggable>
					  ))}
					  {provided.placeholder}
					  <form
						onSubmit={(e) => {
						  e.preventDefault();
						  handleCreateWorkItem(row.id);
						}}
						className="mt-4 flex items-center space-x-2"
					  >
						<input
						  type="text"
						  placeholder="Work item title"
						  value={newWorkItem.rowId === row.id ? newWorkItem.title : ''}
						  onChange={(e) =>
							setNewWorkItem({ ...newWorkItem, rowId: row.id, title: e.target.value })
						  }
						  className="flex-1 p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
						  required
						/>
						<button
						  type="submit"
						  className="bg-[var(--obsidian-700)] text-white py-1 px-3 rounded hover:bg-[var(--obsidian-600)] transition"
						>
						  Add Work Item
						</button>
					  </form>
					  <div className="flex justify-end mt-2">
						<button
						  onClick={() => handleDeleteRow(row.id)}
						  className="opacity-0 group-hover:opacity-100 transition-opacity"
						>
						  <svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 text-red-500 hover:text-red-700"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						  >
							<path
							  strokeLinecap="round"
							  strokeLinejoin="round"
							  strokeWidth={2}
							  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0V3a1 1 0 011-1h2a1 1 0 011 1v1m-7 3h10"
							/>
						  </svg>
						</button>
					  </div>
					</div>
				  )}
				</Droppable>
			  </div>
			))}
		  </div>
		</DragDropContext>
      <Modal
        isOpen={!!selectedWorkItem}
        onRequestClose={() => setSelectedWorkItem(null)}
        className="bg-[var(--obsidian-800)] p-6 rounded-lg max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {selectedWorkItem && (
          <div>
            <h3 className="text-2xl font-bold mb-4">Work Item Details</h3>
            <div className="mb-4">
              <label className="block text-[var(--obsidian-700)] mb-2" htmlFor="title">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={selectedWorkItem.title || ''}
                onChange={(e) =>
                  setSelectedWorkItem({ ...selectedWorkItem, title: e.target.value })
                }
                className="w-full p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
              />
            </div>
            <div className="mb-4">
              <label className="block text-[var(--obsidian-700)] mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={selectedWorkItem.description || ''}
                onChange={(e) =>
                  setSelectedWorkItem({ ...selectedWorkItem, description: e.target.value })
                }
                className="w-full p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
              />
            </div>
            <div className="mb-4">
              <label className="block text-[var(--obsidian-700)] mb-2">Files</label>
              {selectedWorkItem.files?.map((file) => (
                <a
                  key={file.id}
                  href={file.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[var(--obsidian-500)] hover:underline"
                >
                  {file.filename}
                </a>
              ))}
              <input
                type="file"
                onChange={(e) => setNewFile(e.target.files[0])}
                className="mt-2"
              />
              <button
                onClick={handleUploadFile}
                disabled={!newFile}
                className="bg-[var(--obsidian-700)] text-white py-1 px-3 rounded hover:bg-[var(--obsidian-600)] transition mt-2 disabled:opacity-50"
              >
                Upload File
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-[var(--obsidian-700)] mb-2">Comments</label>
              <div className="h-40 overflow-y-auto mb-2">
                {selectedWorkItem.comments
                  ?.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((comment) => (
                    <div key={comment.id} className="mb-2">
                      <p className="text-[var(--obsidian-700)]">
                        <strong>{comment.user?.name || 'Unknown User'}</strong>: {comment.content}
                      </p>
                    </div>
                  ))}
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-2 rounded bg-[var(--obsidian-700)] text-white border border-[var(--obsidian-700)] focus:outline-none focus:border-[var(--obsidian-500)]"
                placeholder="Add a comment"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment}
                className="bg-[var(--obsidian-700)] text-white py-1 px-3 rounded hover:bg-[var(--obsidian-600)] transition mt-2 disabled:opacity-50"
              >
                Add Comment
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedWorkItem(null)}
                className="bg-gray-600 text-white py-1 px-3 rounded hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWorkItem}
                className="bg-[var(--obsidian-700)] text-white py-1 px-3 rounded hover:bg-[var(--obsidian-600)] transition"
              >
                Save
              </button>
			    <button
				onClick={() => handleDeleteWorkItem(selectedWorkItem.id, selectedWorkItem.rowId)}
				className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 transition"
			  >
				Delete
			  </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ProjectBoard;