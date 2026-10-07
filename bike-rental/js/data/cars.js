// Kinetix car fleet. Prices in INR; hourly = same-day plan, daily = across-days plan (24h blocks).
// mileage is kmpl for petrol/diesel and km per charge for electric.

// Demo helper: unavailable cars come back `days` from today at `hour` (local "YYYY-MM-DDTHH:00")
function kinetixInDays(days, hour) {
  var d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0);
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":00";
}

window.KINETIX_CARS = [
  {
    id: "tiago-ev", name: "Tata Tiago EV", brand: "Tata", type: "hatchback", fuel: "electric", transmission: "automatic", seats: 5,
    mileage: 315, hourly: 120, daily: 1800, deposit: 2000, available: true, hero: 1,
    image: "assets/img/cars/tiago-ev.webp",
    specs: { engine: "55 kW (75 PS) permanent-magnet motor", mileage: "315 km / charge", transmission: "Single-speed automatic", seats: "5", boot: "240 L", fuel: "24 kWh battery" },
    blurb: "Compact, silent and cheap to run. The easy pick for errands around town."
  },
  {
    id: "swift", name: "Maruti Suzuki Swift", brand: "Maruti Suzuki", type: "hatchback", fuel: "petrol", transmission: "manual", seats: 5,
    mileage: 24, hourly: 120, daily: 1800, deposit: 2000, available: true, hero: 3,
    image: "assets/img/cars/swift.webp",
    specs: { engine: "1.2 L, 3-cylinder petrol, 82 PS", mileage: "24 kmpl", transmission: "5-speed manual", seats: "5", boot: "265 L", fuel: "37 L tank" },
    blurb: "Light, frugal and easy to park. The hatchback most people learn on."
  },
  {
    id: "comet-ev", name: "MG Comet EV", brand: "MG", type: "hatchback", fuel: "electric", transmission: "automatic", seats: 4,
    mileage: 230, hourly: 130, daily: 1900, deposit: 2000, available: true, hero: null,
    image: "assets/img/cars/comet-ev.webp",
    specs: { engine: "31 kW (42 PS) rear motor", mileage: "230 km / charge", transmission: "Single-speed automatic", seats: "4", boot: "Fold the rear seats for luggage", fuel: "17.3 kWh battery" },
    blurb: "Tiny footprint, tall cabin. Made for narrow lanes and short hops."
  },
  {
    id: "dzire", name: "Maruti Suzuki Dzire", brand: "Maruti Suzuki", type: "sedan", fuel: "petrol", transmission: "manual", seats: 5,
    mileage: 24, hourly: 140, daily: 2000, deposit: 2000, available: true, hero: null,
    image: "assets/img/cars/dzire.webp",
    specs: { engine: "1.2 L, 3-cylinder petrol, 82 PS", mileage: "24 kmpl", transmission: "5-speed manual", seats: "5", boot: "382 L", fuel: "37 L tank" },
    blurb: "A Swift with a proper boot. Good for airport runs and family visits."
  },
  {
    id: "punch-ev", name: "Tata Punch EV", brand: "Tata", type: "suv", fuel: "electric", transmission: "automatic", seats: 5,
    mileage: 421, hourly: 180, daily: 2600, deposit: 3000, available: true, hero: null,
    image: "assets/img/cars/punch-ev.webp",
    specs: { engine: "90 kW (122 PS) permanent-magnet motor", mileage: "421 km / charge", transmission: "Single-speed automatic", seats: "5", boot: "366 L", fuel: "35 kWh battery" },
    blurb: "High seating and a long range. Handles village roads without fuss."
  },
  {
    id: "nexon-ev", name: "Tata Nexon EV", brand: "Tata", type: "suv", fuel: "electric", transmission: "automatic", seats: 5,
    mileage: 465, hourly: 220, daily: 3200, deposit: 3500, available: true, hero: 2,
    image: "assets/img/cars/nexon-ev.webp",
    specs: { engine: "106 kW (144 PS) permanent-magnet motor", mileage: "465 km / charge", transmission: "Single-speed automatic", seats: "5", boot: "350 L", fuel: "40.5 kWh battery" },
    blurb: "The longest range in the fleet. Vijayawada and back on one charge."
  },
  {
    id: "ertiga", name: "Maruti Suzuki Ertiga", brand: "Maruti Suzuki", type: "muv", fuel: "petrol", transmission: "manual", seats: 7,
    mileage: 20, hourly: 220, daily: 3000, deposit: 3000, available: true, hero: null,
    image: "assets/img/cars/ertiga.webp",
    specs: { engine: "1.5 L, 4-cylinder petrol, 103 PS", mileage: "20 kmpl", transmission: "5-speed manual", seats: "7", boot: "209 L with all seats up", fuel: "45 L tank" },
    blurb: "Seven seats without the fuel bill. The family-function regular."
  },
  {
    id: "creta", name: "Hyundai Creta", brand: "Hyundai", type: "suv", fuel: "petrol", transmission: "automatic", seats: 5,
    mileage: 17, hourly: 250, daily: 3500, deposit: 4000, available: false, availableFrom: kinetixInDays(2, 10), hero: null,
    image: "assets/img/cars/creta.webp",
    specs: { engine: "1.5 L, 4-cylinder petrol, 115 PS", mileage: "17 kmpl", transmission: "CVT automatic", seats: "5", boot: "433 L", fuel: "50 L tank" },
    blurb: "Comfortable, well equipped and quiet on the highway."
  },
  {
    id: "city", name: "Honda City", brand: "Honda", type: "sedan", fuel: "petrol", transmission: "automatic", seats: 5,
    mileage: 18, hourly: 260, daily: 3600, deposit: 4000, available: true, hero: null,
    image: "assets/img/cars/city.webp",
    specs: { engine: "1.5 L, 4-cylinder i-VTEC petrol, 121 PS", mileage: "18 kmpl", transmission: "CVT automatic", seats: "5", boot: "506 L", fuel: "40 L tank" },
    blurb: "Roomy rear seat, big boot and a smooth automatic. The long-trip sedan."
  },
  {
    id: "thar", name: "Mahindra Thar", brand: "Mahindra", type: "suv", fuel: "diesel", transmission: "manual", seats: 4,
    mileage: 15, hourly: 300, daily: 4200, deposit: 5000, available: false, availableFrom: kinetixInDays(4, 9), hero: null,
    image: "assets/img/cars/thar.webp",
    specs: { engine: "2.2 L, 4-cylinder diesel, 130 PS", mileage: "15 kmpl", transmission: "6-speed manual, 4WD", seats: "4", boot: "Small; rear seats fold", fuel: "57 L tank" },
    blurb: "Four-wheel drive and a removable top. For the beach road, not the bypass."
  },
  {
    id: "innova-crysta", name: "Toyota Innova Crysta", brand: "Toyota", type: "muv", fuel: "diesel", transmission: "manual", seats: 7,
    mileage: 13, hourly: 380, daily: 5200, deposit: 5000, available: true, hero: 4,
    image: "assets/img/cars/innova-crysta.webp",
    specs: { engine: "2.4 L, 4-cylinder diesel, 150 PS", mileage: "13 kmpl", transmission: "5-speed manual", seats: "7", boot: "300 L with all seats up", fuel: "55 L tank" },
    blurb: "Seven people, their bags and a full day of driving. The group-trip default."
  },
  {
    id: "xuv700", name: "Mahindra XUV700", brand: "Mahindra", type: "suv", fuel: "diesel", transmission: "automatic", seats: 7,
    mileage: 15, hourly: 400, daily: 5500, deposit: 5000, available: true, hero: null,
    image: "assets/img/cars/xuv700.webp",
    specs: { engine: "2.2 L, 4-cylinder diesel, 185 PS", mileage: "15 kmpl", transmission: "6-speed automatic", seats: "7", boot: "240 L with all seats up", fuel: "60 L tank" },
    blurb: "The most powerful car we own, with seven seats and an automatic."
  }
];
