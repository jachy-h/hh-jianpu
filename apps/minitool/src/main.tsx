import './polyfills';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import { installInteractionFeedback } from './interaction-feedback';

const root = document.getElementById('root');
if (root) { installInteractionFeedback(root); createRoot(root).render(<App />); }
