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
  const breakingBadUrl = "https://breaking-bad-quotes.herokuapp.com/v1/quotes";
  const ronUrl = "http://ron-swanson-quotes.herokuapp.com/v2/quotes";
  const numbersUrl = "http://numbersapi.com/random?json";

  // Tweet image and advice
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

  // Tweet breaking bad
  request(breakingBadUrl, async function(error, res, body) {
    const data = JSON.parse(body);
    const { quote, author } = data.pop();
    const status = `${quote}\n— ${author}`;
    try {
      await client.post("statuses/update", { status });
      console.log(`Tweeted out that ${status}`);
    } catch (error) {
      console.log(`Error tweeting ${status}`);
      console.error(error);
    }
  });

  // Tweet Ron
  // request(ronUrl, async function(error, res, body) {
  //   const data = JSON.parse(body).pop();
  //   try {
  //     await client.post("statuses/update", { status: data });
  //     console.log(`Tweeted out that ${data}`);
  //   } catch (error) {
  //     console.log(`Error tweeting ${data}`);
  //     console.error(error);
  //   }
  // });

  // Tweet numbers
  request(numbersUrl, async function(error, response, body) {
    if (error) console.error(error);
    else {
      const { text } = JSON.parse(body);
      try {
        await client.post("statuses/update", { status: text });
        console.log(`Tweeted out that ${text}`);
      } catch (error) {
        console.log(`Error tweeting ${text}`);
        console.error(error);
      }
    }
  });
})();
