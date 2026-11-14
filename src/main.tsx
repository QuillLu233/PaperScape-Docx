/*
 * PaperScape 纸境
 * Copyright © 2026 QuillLulu
 * Created by QuillLulu
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
