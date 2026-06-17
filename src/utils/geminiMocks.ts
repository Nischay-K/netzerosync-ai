import { UserProfile } from './firebase';

export const getMockReceiptAnalysis = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes('grocery') || name.includes('receipt') || name.includes('store') || name.includes('supermarket')) {
    return {
      items: [
        { name: "Organic Beef Sirloin (500g)", category: "Food (Meat)", co2: 15.5 },
        { name: "Avocados (Pack of 4)", category: "Food (Imports)", co2: 2.1 },
        { name: "Local Strawberries (250g)", category: "Food (Local)", co2: 0.3 },
        { name: "Almond Milk (1L - tetrapak)", category: "Food (Dairy Alternative)", co2: 0.8 },
        { name: "Sparkling Water in Plastic (2L)", category: "Shopping (Plastic)", co2: 1.4 }
      ],
      totalCo2: 20.1,
      suggestions: "Your highest contributor is the Beef Sirloin. Swapping beef for poultry or legumes could save up to 14 kg of CO₂. Also, try purchasing sparkling water in aluminum cans or using a soda maker to eliminate single-use plastic bottles."
    };
  } else if (name.includes('electricity') || name.includes('bill') || name.includes('utility') || name.includes('power')) {
    return {
      items: [
        { name: "Electricity Usage (340 kWh)", category: "Energy (Electricity)", co2: 125.8 },
        { name: "Gas usage (15 therms)", category: "Energy (Natural Gas)", co2: 80.2 }
      ],
      totalCo2: 206.0,
      suggestions: "Your grid electricity generates significant carbon. Consider joining a community solar project, installing LED bulbs throughout your home, or setting your thermostat 2°F lower in winter to save approximately 40 kg CO₂/month."
    };
  } else {
    // Generic Travel or Shopping receipt
    return {
      items: [
        { name: "Uber Ride (18.5 km)", category: "Transport (Ride Share)", co2: 4.2 },
        { name: "Fast Fashion Cotton T-shirt", category: "Shopping (Apparel)", co2: 8.5 }
      ],
      totalCo2: 12.7,
      suggestions: "Consider public transit or biking for trips under 10km. For clothing, buying from thrift stores or choosing high-quality organic cotton brands extends clothing lifecycles and halves fashion emissions."
    };
  }
};

export const getMockChatResponse = (message: string, context: UserProfile) => {
  const msg = message.toLowerCase();
  const name = context.displayName || "Warrior";
  const carbon = context.carbonCurrent || 6.8;

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello ${name}! I am your Carbon Copilot. I notice your current carbon footprint is around ${carbon} tons/year. Would you like me to suggest some customized missions to help you reduce this towards your target of ${context.carbonTarget || 3.5} tons?`;
  }
  if (msg.includes('meat') || msg.includes('diet') || msg.includes('food')) {
    return "Food accounts for nearly 26% of global greenhouse emissions. Transitioning to a plant-forward diet is the single most effective action you can take. Swapping just two beef meals per week to vegetarian alternatives saves over 200kg of CO₂ annually, and saves you money!";
  }
  if (msg.includes('travel') || msg.includes('car') || msg.includes('flight') || msg.includes('transport')) {
    return "Transportation is likely a major contributor to your footprint. An average passenger vehicle emits about 120 grams of CO₂ per kilometer. Switching short trips (under 5km) to walking or cycling, and using trains instead of domestic flights, can reduce your transportation emissions by up to 60%.";
  }
  if (msg.includes('electricity') || msg.includes('solar') || msg.includes('energy') || msg.includes('power')) {
    return "Home energy usage is heavily tied to heating and cooling. You can reduce this by making sure your home is properly insulated, washing clothes in cold water, and air-drying when possible. Unplugging 'vampire devices' (televisions, chargers, microwave clocks) when not in use can also trim 5-10% off your electricity bill.";
  }
  return `That's a great question, ${name}. Every action counts in reducing our footprint. Based on your current lifestyle profile (Current emissions: ${carbon} tons/year), I recommend setting a milestone to cut travel emissions by walking or biking, which could save you money and bring your EcoTwin back into a healthy, green state. Try a challenge from the Community board!`;
};

export const getMockProductAnalysis = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes('bottle') || name.includes('plastic') || name.includes('cup')) {
    return {
      productName: "Single-Use Plastic Bottle",
      carbonImpact: 0.15, // kg
      ecoInsight: "PET plastic generates about 0.15 kg of CO₂ per bottle during manufacturing. We recommend checking out Mangrove Reforestation to offset high plastic waste footprints.",
      recommendedOffsetCategory: "Forestry"
    };
  } else if (name.includes('burger') || name.includes('meat') || name.includes('food')) {
    return {
      productName: "Fast Food Beef Burger",
      carbonImpact: 4.8, // kg
      ecoInsight: "Beef production generates high methane and carbon output. Offsetting 4.8 kg carbon using Cookstove efficiency projects is highly recommended.",
      recommendedOffsetCategory: "Efficiency"
    };
  } else if (name.includes('box') || name.includes('package') || name.includes('cardboard')) {
    return {
      productName: "Cardboard Shipping Container",
      carbonImpact: 0.85, // kg
      ecoInsight: "Cardboard requires tree harvesting. Counter this impact by contributing to Mangrove Reforestation to replenish canopy sequestration.",
      recommendedOffsetCategory: "Forestry"
    };
  } else {
    return {
      productName: "Electronic Device / Retail Item",
      carbonImpact: 12.5, // kg
      ecoInsight: "Consumer electronics involve complex supply-chain emissions. Sponsoring the Solar Microgrid Initiative helps displace fossil-fuel manufacturing grids.",
      recommendedOffsetCategory: "Renewables"
    };
  }
};
