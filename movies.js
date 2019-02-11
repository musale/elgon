const request = require("request");
const fs = require("fs");
const Twitter = require("twit");
const jsdom = require("jsdom");
require("dotenv").config();

const { JSDOM } = jsdom;
const movieUrl = "http://xpau.se";

const client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

(async () => {
  request.get(movieUrl, async function(err, res, body) {
    const dom = new JSDOM(body);
    const tr = dom.window.document.querySelector(
      "body > div > div.content > table > tbody > tr:nth-child(1)"
    );
    const items = tr.children;
    const fTweet = `[${new Date().toLocaleString()}] Today's top row on http://xpau.se`;
    const replyTo = await firstTweet(fTweet);
    const tweetId0 = await tweet(items[0], replyTo, 0);
    const tweetId1 = await tweet(items[1], tweetId0, 1);
    const tweetId2 = await tweet(items[2], tweetId1, 2);
    const tweetId3 = await tweet(items[3], tweetId2, 3);
  });
})();

function firstTweet(text) {
  return new Promise(function(resolve, reject) {
    client.post("statuses/update", { status: text }, function(
      err,
      data,
      response
    ) {
      if (err) {
        console.error(`Tweeting error: ${err.message}`);
        return reject(err.message);
      } else return resolve(data.id_str);
    });
  });
}

function tweet(element, replyTo, pos = 0) {
  const title = element
    .querySelector("table > tbody > tr:nth-child(1) > td")
    .textContent.trim();

  // Get the image url
  let imageUrl = element
    .querySelector("#theimages > a:nth-child(1) > img")
    .getAttribute("src");
  imageUrl = `${movieUrl}${imageUrl}`;

  // Get the description
  const description = element.querySelector("#theimages > a:nth-child(2) > pre")
    .innerHTML;
  const descriptionItems = description
    .split("\n")
    .filter(text => text && !text.includes(":") && !text.startsWith("<br>"));
  const descriptionText = descriptionItems.join(" ").trim();

  return new Promise(function(resolve, reject) {
    // Create the images
    request(imageUrl)
      .pipe(fs.createWriteStream(`${pos}.png`))
      .on("finish", () => {
        const mediaData = fs.readFileSync(`${pos}.png`, { encoding: "base64" });
        client.post("media/upload", { media_data: mediaData }, function(
          err,
          data,
          response
        ) {
          const mediaIdStr = data.media_id_string;
          const tweetParams = {
            status: `${title}\n${descriptionText}`,
            media_ids: [mediaIdStr],
            in_reply_to_status_id: replyTo
          };

          client.post("statuses/update", tweetParams, function(
            err,
            data,
            response
          ) {
            if (err) {
              console.error(`Tweeting error: ${err.message}`);
              return reject(err.message);
            } else return resolve(data.id_str);
          });
        });
      });
  });
}
