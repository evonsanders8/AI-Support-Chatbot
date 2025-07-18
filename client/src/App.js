import React, { useState } from 'react';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [similarIssues, setSimilarIssues] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim() === '') return;

    // Add user message to chat
    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and show loading
    setInput('');
    setLoading(true);

    try {
      // Send request to backend
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      
      // Add bot response to chat
      setMessages(prev => [...prev, { text: data.response, isUser: false }]);
      
      // Update similar issues panel
      setSimilarIssues(data.similarIssues || []);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error processing the request.', 
        isUser: false 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Solutions Support Assistant</h1>
      </header>
      
      <div className="container">
        <div className="chat-container">
          <div className="messages">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h2>Welcome to Solutions Support Assistant</h2>
                <p>Describe your technical issue and I'll try to help you solve it based on past similar cases.</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`message ${msg.isUser ? 'user-message' : 'bot-message'}`}>
                  <span className="message-label">{msg.isUser ? 'You' : 'Assistant'}</span>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))
            )}
            {loading && (
              <div className="message bot-message">
                <div className="loading">Thinking<span>.</span><span>.</span><span>.</span></div>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your IT issue..."
              disabled={loading}
            />
            <button type="submit" disabled={loading}>Send</button>
          </form>
        </div>
        
        {similarIssues.length > 0 && (
          <div className="similar-issues">
            <h3>Similar Past Issues</h3>
            {similarIssues.map((issue, index) => (
              <div key={index} className="similar-issue">
                <div className="issue-header">
                  <span className="issue-title">{issue.issue}</span>
                  <span className="match-score">{issue.similarity}% match</span>
                </div>
                <div className="issue-solution">{issue.solution}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;