const fs = require("fs");
const readline = require("readline");
const stream = require("stream");
const db = require("./songs.json");
const instream = fs.createReadStream("./songs.txt");
const outstream = new stream();
const rl = readline.createInterface(instream, outstream);

const arr = [];

rl.on("line", function(line) {
  const data = line.split("-");
  try {
    const artiste = data.shift().trim();
    const newSong = data.shift().trim();
    const songs = db[artiste];

    if (songs !== undefined) {
      if (!songs.includes(newSong)) db[artiste].push(newSong);
    } else db[artiste] = [newSong];
  } catch (error) {
    console.log(line);
    console.error(error);
  }
});

rl.on("close", function() {
  fs.writeFile("songs.json", JSON.stringify(db, null, 2), "utf-8", function(
    err
  ) {
    if (err) console.error(err);
    console.log("File updates");
  });
});
