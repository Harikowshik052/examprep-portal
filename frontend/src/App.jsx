import { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Navbar from "./components/Navbar";
import Filters from "./components/Filters";
import PdfViewer from "./components/PdfViewer";
import Chatbot from "./components/Chatbot";
import { getSession, clearSession, isTokenExpired } from "./utils/auth";
import styles from "./App.module.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const existing = getSession();
    if (existing && !isTokenExpired(existing.token)) {
      setSession(existing);
    } else {
      clearSession();
    }
  }, []);

  function handleLogin(token, email) {
    setSession({ token, email });
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setSelectedEntry(null);
    setChatOpen(false);
  }

  if (!session) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className={styles.layout}>
      <Navbar
        email={session.email}
        onLogout={handleLogout}
        onChatbotToggle={() => setChatOpen((o) => !o)}
      />
      <main className={styles.main}>
        <Filters onFileSelect={setSelectedEntry} />
        <PdfViewer entry={selectedEntry} />
      </main>
      <Chatbot
        entry={selectedEntry}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
