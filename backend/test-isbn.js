const isbn = "9782035842169";

async function test() {
  console.log("Testing OpenLibrary with User-Agent...");
  try {
    const ol = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("OL Status:", ol.status);
    console.log("OL Headers Content-Type:", ol.headers.get('content-type'));
    const text = await ol.text();
    console.log("OL Response text (first 200 chars):", text.slice(0, 200));
    try {
      const json = JSON.parse(text);
      console.log("OL parsed JSON keys:", Object.keys(json));
    } catch (e) {
      console.log("OL JSON Parse error:", e.message);
    }
  } catch(e) { console.error("OL Error:", e.message) }

  console.log("\nTesting Google Books with User-Agent...");
  try {
    const gb = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("GB Status:", gb.status);
    const text = await gb.text();
    console.log("GB Response text (first 200 chars):", text.slice(0, 200));
  } catch(e) { console.error("GB Error:", e.message) }
}
test();
