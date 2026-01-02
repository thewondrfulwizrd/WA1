const statusEl = document.getElementById("status");
const outEl = document.getElementById("output");

async function main() {
  statusEl.textContent = "Loading StatCan WDS…";

  const res = await fetch("https://www150.statcan.gc.ca/t1/wds/rest/getAllCubesList");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();

  statusEl.textContent = "Loaded. Showing first 5 tables/cubes:";
  outEl.textContent = JSON.stringify(json?.object?.slice?.(0, 5) ?? json, null, 2);
}

main().catch((err) => {
  statusEl.textContent = "Error loading StatCan data.";
  outEl.textContent = String(err);
});
