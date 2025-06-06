
import { useEffect } from 'react';

const SwipeAnimations = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slide-up {
        0% { transform: translateY(0%); }
        50% { transform: translateY(-20%); }
        100% { transform: translateY(0%); }
      }
      
      @keyframes slide-down {
        0% { transform: translateY(0%); }
        50% { transform: translateY(20%); }
        100% { transform: translateY(0%); }
      }
      
      .animate-slide-up {
        animation: slide-up 0.3s ease-out;
      }
      
      .animate-slide-down {
        animation: slide-down 0.3s ease-out;
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
