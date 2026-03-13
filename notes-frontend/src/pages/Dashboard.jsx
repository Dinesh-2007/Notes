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
      .eq("user_id", session.user.id)
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
        updated_at: new Date().toISOString(),
    })
    .eq("id", editingId);

      if (error) {
        alert(error.message);
      } else {
        setTitle("");
        setContent("");
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
        },
      ]);

      if (error) {
        alert(error.message);
      } else {
        setTitle("");
        setContent("");
        fetchNotes();
      }
    }
  };

  // Edit note
  const editNote = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingId(note.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel editing
  const cancelEdit = () => {
    setTitle("");
    setContent("");
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

  // Generate a v4-ish UUID for share tokens (fallback when crypto.randomUUID is missing)
  const createShareToken = () => {
    const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : null;

    if (typeof cryptoObj?.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }

    if (cryptoObj?.getRandomValues) {
      const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
      const toHex = (b) => b.toString(16).padStart(2, "0");
      return (
        toHex(bytes[0]) +
        toHex(bytes[1]) +
        toHex(bytes[2]) +
        toHex(bytes[3]) +
        "-" +
        toHex(bytes[4]) +
        toHex(bytes[5]) +
        "-" +
        toHex(bytes[6]) +
        toHex(bytes[7]) +
        "-" +
        toHex(bytes[8]) +
        toHex(bytes[9]) +
        "-" +
        toHex(bytes[10]) +
        toHex(bytes[11]) +
        toHex(bytes[12]) +
        toHex(bytes[13]) +
        toHex(bytes[14]) +
        toHex(bytes[15])
      );
    }

    // Ultra-fallback: Math.random()-based UUID shape (good enough for local dev)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Ensure a note has a share_token; create and persist one if missing
  const ensureShareToken = async (note) => {
    if (note.share_token) return note.share_token;

    const newToken = createShareToken();
    const { data, error } = await supabase
      .from("notes")
      .update({ share_token: newToken })
      .eq("id", note.id)
      .select("share_token")
      .single();

    if (error) {
      throw error;
    }

    // keep local state in sync so subsequent copies reuse the same token
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id ? { ...n, share_token: data.share_token } : n
      )
    );

    return data.share_token;
  };

  // Copy share link, guaranteeing a valid share_token exists first
  const copyShareLink = async (note) => {
    try {
      const shareId = await ensureShareToken(note);
      const link = `${window.location.origin}/note/${shareId}`;
      await navigator.clipboard.writeText(link);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    } catch (err) {
      console.error("Error generating share link:", err);
      alert("Could not create a shareable link. Please try again.");
    }
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
          onClick={() => copyShareLink(note)}
          title="Copy share link"
        >
          {copiedNoteId === note.id ? "✓ Copied!" : "🔗 Copy Link"}
        </button>

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
