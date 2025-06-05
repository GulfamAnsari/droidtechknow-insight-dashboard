
import { useEffect } from 'react';

const SwipeAnimations = () => {
  useEffect(() => {
    // Add custom CSS animations for swipe gestures
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slide-up {
        0% {
          transform: translateY(0);
          opacity: 1;
        }
        100% {
          transform: translateY(-20px);
          opacity: 0.8;
        }
      }
      
      @keyframes slide-down {
        0% {
          transform: translateY(0);
          opacity: 1;
        }
        100% {
          transform: translateY(20px);
          opacity: 0.8;
        }
      }
      
      .animate-slide-up {
        animation: slide-up 0.2s ease-out forwards;
      }
      
      .animate-slide-down {
        animation: slide-down 0.2s ease-out forwards;
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
