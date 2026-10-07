// Bhimavaram pickup and drop points. Coordinates from OpenStreetMap; rides and car pickups share this list.
window.KINETIX_CITY = "Bhimavaram";
window.KINETIX_PLACES = [
  { id: "junction", name: "Bhimavaram Junction", lat: 16.5444, lng: 81.5376, kind: "Railway station" },
  { id: "town-station", name: "Bhimavaram Town Station", lat: 16.5472, lng: 81.5196, kind: "Railway station" },
  { id: "bus-station", name: "APSRTC Bus Station", lat: 16.545, lng: 81.5298, kind: "Bus stand" },
  { id: "old-bus-stand", name: "Old Bus Stand", lat: 16.5443, lng: 81.5212, kind: "Bus stand" },
  { id: "mavullamma", name: "Mavullamma Temple", lat: 16.5428, lng: 81.5255, kind: "Temple" },
  { id: "budavaram-market", name: "Budavaram Market", lat: 16.5438, lng: 81.5189, kind: "Market" },
  { id: "iskcon", name: "ISKCON Temple", lat: 16.5424, lng: 81.5086, kind: "Temple" },
  { id: "srkr", name: "SRKR Engineering College", lat: 16.5445, lng: 81.4964, kind: "College" },
  { id: "vishnupur", name: "Vishnu Institute, Vishnupur", lat: 16.5677, lng: 81.524, kind: "College" },
  { id: "dnr", name: "DNR College", lat: 16.5361, lng: 81.5199, kind: "College" },
  { id: "kgrl", name: "KGRL College", lat: 16.5273, lng: 81.5247, kind: "College" },
  { id: "sivaraopeta", name: "Sivaraopeta", lat: 16.5467, lng: 81.5139, kind: "Area" },
  { id: "balusumoodi", name: "Balusumoodi", lat: 16.5367, lng: 81.5159, kind: "Area" },
  { id: "sriramapuram", name: "Sriramapuram", lat: 16.541, lng: 81.504, kind: "Area" },
  { id: "gandhinagar", name: "Gandhinagar", lat: 16.5441, lng: 81.5296, kind: "Area" },
  { id: "narasa-agraharam", name: "Narasa Agraharam", lat: 16.5509, lng: 81.5353, kind: "Area" },
  { id: "housing-board", name: "Housing Board Colony", lat: 16.5458, lng: 81.544, kind: "Area" },
  { id: "gunupudi", name: "Gunupudi", lat: 16.5318, lng: 81.5398, kind: "Area" },
  { id: "pedda-amiram", name: "Pedda Amiram", lat: 16.5467, lng: 81.4823, kind: "Village" },
  { id: "chinna-amiram", name: "Chinna Amiram", lat: 16.5373, lng: 81.4924, kind: "Village" },
  { id: "kovvada", name: "Kovvada", lat: 16.5678, lng: 81.516, kind: "Village" },
  { id: "vissakoderu", name: "Vissakoderu", lat: 16.5504, lng: 81.5646, kind: "Village" },
  { id: "kumudavalli", name: "Kumudavalli", lat: 16.5668, lng: 81.5393, kind: "Village" },
  { id: "annavaram", name: "Annavaram", lat: 16.5722, lng: 81.5124, kind: "Village" },
  { id: "vendram", name: "Vendram", lat: 16.5621, lng: 81.4699, kind: "Village" },
  { id: "undi", name: "Undi", lat: 16.5808, lng: 81.4648, kind: "Village" },
  { id: "palakoderu", name: "Palakoderu", lat: 16.5862, lng: 81.5469, kind: "Village" },
  { id: "pennada", name: "Pennada Agraharam", lat: 16.5419, lng: 81.5781, kind: "Railway station" }
];
window.KINETIX_AREAS = window.KINETIX_PLACES.map(function (p) { return p.name; });
// Static map for "choose on map": OpenStreetMap tiles, zoom 14, tile x 11899-11904 / y 7425-7430 (see assets/img/map/SOURCES.md)
window.KINETIX_MAP = { image: "assets/img/map/bhimavaram.webp", zoom: 14, x0: 11899, y0: 7425, nx: 6, ny: 6, width: 1536, height: 1536 };
