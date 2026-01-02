const statusEl = document.getElementById("status");
const outEl = document.getElementById("output");

statusEl.textContent = "It works. Next: load StatCan data.";
outEl.textContent = JSON.stringify({ time: new Date().toISOString() }, null, 2);
