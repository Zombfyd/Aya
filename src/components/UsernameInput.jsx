import React, { useState } from 'react';

const UsernameInput = ({ onSubmit }) => {
  const [inputName, setInputName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputName.trim().length > 0 && inputName.length <= 25) {
      onSubmit(inputName.trim());
    }
  };

  return (
    <div className="username-setup">
      <h2>Enter Your Name to Play</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          placeholder="Your name (max 25 characters)"
          maxLength={25}
          required
        />
        <button type="submit">Start Playing</button>
      </form>
    </div>
  );
};

export default UsernameInput; 