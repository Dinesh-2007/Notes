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
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (!error) {
      setNote(data);
    }

    setLoading(false);
  };

  if (loading) return <p style={{ padding: "40px" }}>Loading...</p>;

  if (!note || !note.is_public)
    return <p style={{ padding: "40px" }}>This note is private.</p>;

  return (
    <div style={{ padding: "40px" }}>
      <h2>{note.title}</h2>
      <p>{note.content}</p>
    </div>
  );
}

export default PublicNote;