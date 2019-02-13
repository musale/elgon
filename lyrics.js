const fs = require("fs");
const request = require("request");
const Twitter = require("twit");
const db = require("./songs.json");

require("dotenv").config();
const lyricsBaseUrl = "https://api.lyrics.ovh/v1";
const lyricSize = 4;

const client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

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
      const tweetStr = chopLyricsToTweet(splitLyrics, artiste);
      const fileUrl = "https://picsum.photos/1024/512/?random";

      // Tweet image
      request(fileUrl)
        .pipe(fs.createWriteStream("image.png"))
        .on("finish", async () => {
          const pathToImage = "image.png";
          const mediaData = fs.readFileSync(pathToImage, {
            encoding: "base64"
          });
          try {
            client.post(
              "media/upload",
              {
                media_data: mediaData
              },
              async function(err, data, response) {
                const mediaIdStr = data.media_id_string;
                try {
                  const tweetParams = {
                    status: tweetStr,
                    media_ids: [mediaIdStr]
                  };
                  await client.post("statuses/update", tweetParams);
                  console.log(`Tweeted out that ${tweetStr}`);
                } catch (error) {
                  console.log(`Error tweeting ${tweetStr}`);
                  console.error(error);
                }
              }
            );
          } catch (error) {
            console.log(`Error tweeting ${tweetStr}`);
            console.error(error);
          }
        });
      return;
    }
  });
}
function chopLyricsToTweet(splitLyrics, artiste, retry = 0) {
  if (retry >= 10) return;
  const minRange = getRandom(0, splitLyrics.length - lyricSize);
  let tweetStrList = splitLyrics.slice(minRange, minRange + lyricSize);
  tweetStrList = [...new Set(tweetStrList)];
  // If I want to add hashtags
  // const tweetStr = `${tweetStrList.join("\n")}\n#${artiste.replace(
  //   /\s+/g,
  //   ""
  // )}`.trim();
  const tweetStr = tweetStrList.join("\n").trim();
  if (tweetStr.length <= 280) return tweetStr;
  else return chopLyricsToTweet(splitLyrics, artiste, retry + 1);
}
