const cheerio = require("cheerio");
const axios = require("axios");
const { Octokit } = require("@octokit/rest");

const pat = process.env.PAT;
const kit = new Octokit({ auth: pat });

if (!pat) throw new Error("No PAT");

async function fetchMostRecent() {
  const { data } = await axios.get("https://www.imdb.com/user/ur122151934");
  const $ = cheerio.load(data);
  const list = $("div.ratings.image-list > div.title-list > div.item");

  const titleData = list.map((_, item) => {
    const children = item.children.filter((c) => c.type === "tag");

    const title = children.find((c) => c.attribs.class === "title").children[0].children[0].data;
    const img = children.find((c) => c.children[0].name === "img").children[0].attribs.src;
    const rating = children.find((c) => c.attribs.class === "sub-item").children[0].children[0].data;
    const link = "https://imdb.com" + children[0].attribs.href;

    return { title, img, rating, link };
  });

  return titleData[0];
}

async function fetchFavourite() {
  const { data } = await axios.get("https://www.imdb.com/list/ls501572396/");
  const $ = cheerio.load(data);
  const list = $("div.lister-list");
  const node = list.children()[0];

  const title = $("div.lister-item-content > h3 > a", node)[0].children[0].data;
  const img = $("div.lister-item-image > a > img", node)[0].attribs.loadlate;
  const desc = $("div.lister-item-content > p", node)[1].children[0].data.trim();
  const genre = $("div.lister-item-content > p.text-muted.text-small > span.genre", node)[0].children[0].data.trim();
  const link = "https://imdb.com" + $("div.lister-item-image > a")[0].attribs.href;

  return { title, img, desc, genre, link };
}

fetchFavourite().then((favourite) => {
  fetchMostRecent().then(async (recent) => {
    const readme = await kit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: "matievisthekat",
      repo: "matievisthekat",
      path: "README.md",
    });

    await kit.repos.createOrUpdateFileContents({
      owner: "matievisthekat",
      repo: "matievisthekat",
      path: "README.md",
      sha: readme.data.sha,
      message: "update movies",
      committer: {
        email: "john.doe@test.com",
        name: "john doe",
      },
      content: Buffer.from(
        `
${Buffer.from(readme.data.content, "base64").toString().split("<!--SECTION:movies-->")[0]}

<!--SECTION:movies-->
| Favourite Movie | Most Recently Watched |
| :---: | :---: |
| [![Movie cover](${favourite.img})](${favourite.link}) | [![Movie cover](${recent.img})](${recent.link}) |
| ${favourite.title} | ${recent.title} |
| ${favourite.genre} | My rating: ${recent.rating} |
`
      ).toString("base64"),
    });
  });
});
