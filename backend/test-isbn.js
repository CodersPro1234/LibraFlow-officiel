const isbn = "9782035842169";

async function test() {
  console.log("Testing OpenLibrary...");
  try {
    const ol = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const olData = await ol.json();
    console.log("OL:", olData);
  } catch(e) { console.error("OL Error:", e.message) }

  console.log("\nTesting Google Books...");
  try {
    const gb = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const gbData = await gb.json();
    console.log("GB:", gbData.items ? gbData.items.length + " items found" : gbData);
  } catch(e) { console.error("GB Error:", e.message) }
}
test();
