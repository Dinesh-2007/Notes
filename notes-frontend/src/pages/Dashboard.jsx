import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import "./Dashboard.css";


const defaultAvatars = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
  "/avatars/avatar6.png",
  "/avatars/avatar7.png",
  "/avatars/avatar8.png",
  "/avatars/avatar9.png",
  "/avatars/avatar10.png",
];




function Dashboard({ session, theme, setTheme }) {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [userAvatar, setUserAvatar] = useState("/avatars/avatar1.png");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [copiedNoteId, setCopiedNoteId] = useState(null);
  const filteredNotes = notes.filter((note) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      note.title?.toLowerCase().includes(term)
    );
  });

  // Ensure profile exists and fetch it
  const ensureProfileExists = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          id: session.user.id,
          avatar_url: "/avatars/avatar1.png",
        },
      ]);
      if (insertError) {
        console.error("Error creating profile:", insertError);
      }
      setUserAvatar("/avatars/avatar1.png");
    } else if (data) {
      setUserAvatar(data.avatar_url || "/avatars/avatar1.png");
    }
  };

  // Fetch notes
  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
    } else {
      setNotes(data);
    }
  };

  // Update user avatar
  const updateAvatar = async (avatarUrl) => {
    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: session.user.id,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

    if (!error) {
      setUserAvatar(avatarUrl);
      setShowAvatarPicker(false);
    } else {
      console.error("Avatar update error:", error);
      alert(`Failed to update avatar: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchNotes();
    ensureProfileExists();
  }, []);

  // Add or Update note
  const saveNote = async () => {
    if (!title || !content) {
      alert("Please enter both title and content");
      return;
    }

    if (editingId) {
      // Update existing note
      const { error } = await supabase
        .from("notes")
        .update({
        title,
        content,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
    })
    .eq("id", editingId);

      if (error) {
        alert(error.message);
      } else {
        setTitle("");
        setContent("");
        setIsPublic(false);
        setEditingId(null);
        fetchNotes();
      }
    } else {
      // Add new note
      const { error } = await supabase.from("notes").insert([
        {
          title,
          content,
          user_id: session.user.id,
          is_public: isPublic,
        },
      ]);

      if (error) {
        alert(error.message);
      } else {
        setTitle("");
        setContent("");
        setIsPublic(false);
        fetchNotes();
      }
    }
  };

  // Edit note
  const editNote = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setIsPublic(note.is_public || false);
    setEditingId(note.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel editing
  const cancelEdit = () => {
    setTitle("");
    setContent("");
    setIsPublic(false);
    setEditingId(null);
  };

  // Delete note
  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await supabase.from("notes").delete().eq("id", confirmDeleteId);
    setConfirmDeleteId(null);
    fetchNotes();
  };

  const cancelDelete = () => setConfirmDeleteId(null);

  // Toggle note public/private
  const togglePublic = async (noteId, currentStatus) => {
    const { error } = await supabase
      .from("notes")
      .update({ is_public: !currentStatus })
      .eq("id", noteId);

    if (!error) {
      fetchNotes();
    } else {
      alert("Failed to update note status");
    }
  };

  // Copy share link
  const copyShareLink = (noteId) => {
    const link = `${window.location.origin}/note/${noteId}`;
    navigator.clipboard.writeText(link);
    setCopiedNoteId(noteId);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <img
            src={userAvatar}
            alt="User Avatar"
            className="user-avatar"
            onClick={() => setShowAvatarPicker(true)}
            title="Click to change avatar"
          />
          <div>
            <h1>My Notes</h1>
            <p className="user-email">{session?.user?.email}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Create/Edit Note Section */}
        <div className="note-form-card">
          <h2>{editingId ? "Edit Note" : "Create New Note"}</h2>
          
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
          />

          <textarea
            placeholder="Write your note content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="textarea-field"
            rows="6"
          />

          <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="isPublic" style={{ cursor: "pointer" }}>
              🌐 Make this note publicly shareable
            </label>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={saveNote}>
              {editingId ? "Update Note" : "Add Note"}
            </button>
            {editingId && (
              <button className="btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Notes List */}
        <div className="notes-section">
          <h2>Your Notes ({notes.length})</h2>
          <div className="notes-toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="Search notes by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {notes.length === 0 ? (
            <div className="empty-state">
              <p>📝 No notes yet. Create your first note above!</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty-state">
              <p>🔍 No notes match your search.</p>
            </div>
          ) : (
            <div className="notes-grid">
  {filteredNotes.map((note) => (
    <div key={note.id} className="note-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <h3 className="note-title">{note.title}</h3>
        <span style={{ 
          fontSize: "12px", 
          padding: "2px 8px", 
          borderRadius: "4px",
          backgroundColor: note.is_public ? "#4caf50" : "#999",
          color: "white"
        }}>
          {note.is_public ? "🌐 Public" : "🔒 Private"}
        </span>
      </div>

      <small className="note-timestamp">
        Last updated: {new Date(note.updated_at).toLocaleString()}
      </small>

      <div className="note-actions">
        <button
          className="btn-edit"
          onClick={() => editNote(note)}
        >
          ✏️ Edit
        </button>

        <button
          className="btn-secondary"
          onClick={() => togglePublic(note.id, note.is_public)}
          title={note.is_public ? "Make private" : "Make public"}
        >
          {note.is_public ? "🔒 Private" : "🌐 Share"}
        </button>

        {note.is_public && (
          <button
            className="btn-secondary"
            onClick={() => copyShareLink(note.id)}
            title="Copy share link"
          >
            {copiedNoteId === note.id ? "✓ Copied!" : "🔗 Copy Link"}
          </button>
        )}

        <button
          className="btn-delete"
          onClick={() => setConfirmDeleteId(note.id)}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  ))}
</div>
          )}
        </div>
      </div>

      {confirmDeleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Are you sure?</h3>
            <p>This note will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
              <button className="btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarPicker && (
        <div className="modal-overlay" onClick={() => setShowAvatarPicker(false)}>
          <div className="modal avatar-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Choose Your Avatar</h3>
            <div className="avatar-grid">
              {defaultAvatars.map((avatar, index) => (
                <img
                  key={index}
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className={`avatar-option ${userAvatar === avatar ? 'selected' : ''}`}
                  onClick={() => updateAvatar(avatar)}
                />
              ))}
            </div>
            <button
              className="btn-secondary"
              onClick={() => setShowAvatarPicker(false)}
              style={{ marginTop: "15px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
