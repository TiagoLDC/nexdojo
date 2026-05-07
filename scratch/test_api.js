const test = async () => {
  try {
    const res = await fetch('http://localhost:3005/api/academies');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('Academies count:', data.length);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error fetching academies:', e.message);
  }
};

test();
