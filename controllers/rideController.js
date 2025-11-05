const Ride = require("../models/Ride");
const Agent = require("../models/Agent");

// ✅ Helper: Calculate Distance (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ✅ Simple fare calculation
function calculateFare(distance, vehicleType) {
  const baseRates = {
    BIKE: 10, // ₹ per km
    AUTO: 15,
    CAR: 20,
  };
  return Math.round(baseRates[vehicleType] * distance);
}

// ✅ Book Ride & Assign Nearest Agent
exports.bookRide = async (req, res) => {
  try {
    const { userId, pickup, drop, vehicleType, paymentMethod } = req.body;

    if (!pickup || !drop || !pickup.lat || !drop.lat) {
      return res.status(400).json({ message: "Invalid pickup/drop location" });
    }

    // Find online ride agents
    const agents = await Agent.find({
      type: "RIDE",
      isOnline: true,
      vehicleType,
    });

    if (!agents.length)
      return res.status(404).json({ message: "No online agents found nearby" });

    // Sort by nearest distance & best rating
    const nearbyAgents = agents
      .map((agent) => {
        if (!agent.currentLocation?.lat || !agent.currentLocation?.lng) return null;
        const distance = calculateDistance(
          pickup.lat,
          pickup.lng,
          agent.currentLocation.lat,
          agent.currentLocation.lng
        );
        return { agent, distance };
      })
      .filter(Boolean)
      .filter((a) => a.distance <= 8) // within 8 km radius
      .sort((a, b) => {
        if (b.agent.rating === a.agent.rating) return a.distance - b.distance;
        return b.agent.rating - a.agent.rating;
      });

    const assignedAgent = nearbyAgents.length > 0 ? nearbyAgents[0].agent : null;

    // Distance between pickup and drop
    const distanceKm = calculateDistance(
      pickup.lat,
      pickup.lng,
      drop.lat,
      drop.lng
    );

    const fare = calculateFare(distanceKm, vehicleType);

    // Create ride
    const ride = new Ride({
      userId,
      agentId: assignedAgent?._id || null,
      pickup,
      drop,
      distanceKm,
      fare,
      vehicleType,
      paymentMethod,
      status: assignedAgent ? "ASSIGNED" : "PENDING",
    });

    await ride.save();

    res.status(201).json({
      message: assignedAgent
        ? `Ride booked and assigned to ${assignedAgent.name}`
        : "Ride booked but no nearby agent found",
      ride,
    });
  } catch (error) {
    console.error("Ride Booking Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Get Rides for a User
exports.getRidesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const rides = await Ride.find({ userId })
      .populate("agentId", "name phone rating vehicleType");
    res.json(rides);
  } catch (error) {
    console.error("Get Rides Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
