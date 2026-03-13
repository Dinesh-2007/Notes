import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

function PublicNote() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNote();
  }, []);

  const fetchNote = async () => {
    // Resolve via secure function so only the holder of the share token can fetch
    const { data, error } = await supabase.rpc("get_shared_note", {
      p_token: id,
    });

    // rpc returns array when function returns SETOF
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row) setNote(row);

    setLoading(false);
  };

  if (loading) return <p style={{ padding: "40px" }}>Loading...</p>;

  if (!note)
    return <p style={{ padding: "40px" }}>This note is private or link is invalid.</p>;

  return (
    <div style={{ padding: "40px" }}>
      <h2>{note.title}</h2>
      <p>{note.content}</p>
    </div>
  );
}

export default PublicNote;
