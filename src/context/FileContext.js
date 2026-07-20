'use client';

import { createContext, useContext, useState } from 'react';

const FileContext = createContext(null);

export function FileProvider({ children }) {
  const [sharedFile, setSharedFile] = useState(null);

  const setFile = (file) => {
    setSharedFile(file);
  };

  const clearFile = () => {
    setSharedFile(null);
  };

  return (
    <FileContext.Provider value={{ sharedFile, setFile, clearFile }}>
      {children}
    </FileContext.Provider>
  );
}

export function useSharedFile() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useSharedFile must be used within a FileProvider');
  }
  return context;
}
