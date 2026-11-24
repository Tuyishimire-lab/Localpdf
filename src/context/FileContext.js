'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const FileContext = createContext(null);

export function FileProvider({ children }) {
  const [sharedFiles, setSharedFiles] = useState([]);

  const setFile = useCallback((file) => {
    setSharedFiles(file ? [file] : []);
  }, []);

  const setFiles = useCallback((files) => {
    setSharedFiles(Array.isArray(files) ? files.filter(Boolean) : files ? [files] : []);
  }, []);

  const clearFile = useCallback(() => {
    setSharedFiles([]);
  }, []);

  const value = useMemo(
    () => ({
      sharedFile: sharedFiles[0] || null,
      sharedFiles,
      setFile,
      setFiles,
      clearFile,
      clearFiles: clearFile,
    }),
    [sharedFiles, setFile, setFiles, clearFile]
  );

  return (
    <FileContext.Provider value={value}>
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
