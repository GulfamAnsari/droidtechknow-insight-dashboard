
import { useEffect } from 'react';

const SwipeAnimations = () => {
  useEffect(() => {
    // Add custom CSS animations for swipe gestures
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slide-left {
        0% {
          transform: translateX(0);
          opacity: 1;
        }
        100% {
          transform: translateX(-20px);
          opacity: 0.8;
        }
      }
      
      @keyframes slide-right {
        0% {
          transform: translateX(0);
          opacity: 1;
        }
        100% {
          transform: translateX(20px);
          opacity: 0.8;
        }
      }
      
      .animate-slide-left {
        animation: slide-left 0.2s ease-out forwards;
      }
      
      .animate-slide-right {
        animation: slide-right 0.2s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

export default SwipeAnimations;
