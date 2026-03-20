import fs from 'fs';

async function run() {
  const res = await fetch('https://api.dicebear.com/7.x/avataaars/schema.json');
  const text = await res.text();
  console.log(text);
}

run();
