
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
      
      @keyframes scale-bounce {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
        100% {
          transform: scale(1);
        }
      }
      
      .animate-slide-up {
        animation: slide-up 0.2s ease-out forwards;
      }
      
      .animate-slide-down {
        animation: slide-down 0.2s ease-out forwards;
      }
      
      .animate-scale-bounce {
        animation: scale-bounce 0.3s ease-out;
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
