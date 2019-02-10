const fs = require("fs");
const request = require("request");
const lyricsBaseUrl = "https://api.lyrics.ovh/v1";

require("dotenv").config();
const db = require("./songs.json");
const lyricSize = 4;

function pickRandomProperty(obj) {
  var result;
  var count = 0;
  for (var prop in obj) if (Math.random() < 1 / ++count) result = prop;
  return result;
}

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

(async () => {
  const artiste = pickRandomProperty(db);
  const items = db[artiste];
  const song = items[(items.length * Math.random()) | 0];
  const lyricsUrl = encodeURI(`${lyricsBaseUrl}/${artiste}/${song}`);

  tweetLyrics(lyricsUrl, song, artiste);
})();

function tweetLyrics(lyricsUrl, song, artiste, retry = 0) {
  request(lyricsUrl, async function(err, _res, body) {
    const data = JSON.parse(body);
    const { lyrics, error } = data;
    if (retry >= 3) {
      // Change artiste
      retry = 0;
      artiste = pickRandomProperty(db);
      console.log(`Changed artiste to ${artiste}`);
    }
    if (err) {
      console.log(`Error getting lyrics for ${song} by ${artiste}`);
      console.error(err);
    } else if (error === "No lyrics found") {
      retry += 1;
      const items = db[artiste];
      const song = items[(items.length * Math.random()) | 0];
      const lyricsUrl = encodeURI(`${lyricsBaseUrl}/${artiste}/${song}`);
      console.log(`Rechecking lyrics for ${song} by ${artiste}`);
      tweetLyrics(lyricsUrl, song, artiste, retry);
    } else {
      const splitLyrics = lyrics.split("\n").filter(n => n);
      const tweetStr = chopLyricsToTweet(splitLyrics);
      // TODO: tweetStr
      console.log(tweetStr);
      return;
    }
  });
}
function chopLyricsToTweet(splitLyrics, retry = 0) {
  if (retry >= lyricSize) return;
  const minRange = getRandom(0, splitLyrics.length - lyricSize);
  const tweetStrList = splitLyrics.slice(minRange, minRange + lyricSize);
  const tweetStr = tweetStrList.join("\n");
  if (tweetStr.length <= 280) return tweetStr;
  else return chopLyricsToTweet(splitLyrics, retry + 1);
}
