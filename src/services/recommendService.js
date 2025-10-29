const Song = require("../models/Song");
const User = require("../models/User");

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += (a[i] || 0) * (b[i] || 0);
  }
  return s;
}
function norm(a) {
  return Math.sqrt(a.reduce((s, v) => s + (v || 0) * (v || 0), 0));
}
