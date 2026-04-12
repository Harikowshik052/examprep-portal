import styles from './Navbar.module.css';

export default function Navbar({ email, onLogout, onChatbotToggle }) {
  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <span>📚</span>
        <span>Vishnu Exam Prep</span>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.chatbotBtn}
          onClick={onChatbotToggle}
          title="Open AI Chatbot"
        >
          🤖 AI Chatbot
        </button>
        <div className={styles.userInfo}>
          <span className={styles.emailBadge}>{email}</span>
          <button className={styles.logoutBtn} onClick={onLogout} title="Logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
