const fs = require("fs");
const request = require("request");

require("dotenv").config();

const Twitter = require("twit");

const client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

(async () => {
  const fileUrl = "https://picsum.photos/1024/512/?random";
  const adviceUrl = "https://api.adviceslip.com/advice";

  request(fileUrl)
    .pipe(fs.createWriteStream("image.png"))
    .on("finish", async () => {
      const pathToImage = "image.png";
      const mediaData = fs.readFileSync(pathToImage, { encoding: "base64" });
      try {
        client.post(
          "media/upload",
          {
            media_data: mediaData
          },
          async function(err, data, response) {
            const mediaIdStr = data.media_id_string;
            request(adviceUrl, async function(error, response, body) {
              const slip = JSON.parse(body);
              const advice = slip["slip"]["advice"];
              const tweetParams = {
                status: advice,
                media_ids: [mediaIdStr]
              };
              try {
                await client.post("statuses/update", tweetParams);
                console.log(`Tweeted out that ${advice}`);
              } catch (error) {
                console.error(`Tweeting error: ${error.message}`);
              }
            });
          }
        );
      } catch (error) {
        console.error(`Creating media error: ${error.message}`);
      }
    });
})();
