import React from "react";

export default function FoodTracker() {
  return (
    <iframe
      style={{
        height: "-webkit-fill-available",
        width: "-webkit-fill-available"
      }}
      src="https://www.nutritionix.com/dashboard"
      allowFullScreen
    ></iframe>
  );
}
