const isbn = "9782369350019";
fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
