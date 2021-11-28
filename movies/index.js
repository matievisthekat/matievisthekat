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
  const node = list.children()[Math.floor(Math.random() * list.children().length)];

  const title = $("div.lister-item-content > h3 > a", node)[0].children[0].data;
  const img = $("div.lister-item-image > a > img", node)[0].attribs.loadlate;
  const desc = $("div.lister-item-content > p", node)[1].children[0].data.trim();
  const genre = $("div.lister-item-content > p.text-muted.text-small > span.genre", node)[0].children[0].data.trim();
  const avgRating = $("div.ipl-rating-star.small > span.ipl-rating-star__rating")[0].children[0].data;
  const link = "https://imdb.com" + $("div.lister-item-image > a")[0].attribs.href;

  return { title, img, desc, genre, avgRating, link };
}

fetchFavourite().then((favourite) => {
  fetchMostRecent().then(async (recent) => {
    const readme = await kit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: "matievisthekat",
      repo: "matievisthekat",
      path: "README.md",
    });

    const markers = [
      "favourite.link",
      "favourite.title",
      "favourite.img",
      "favourite.desc",
      "favourite.genre",
      "favourite.avgRating",

      "recent.link",
      "recent.title",
      "recent.img",
      "recent.rating",

      "common.timestamp",
    ];

    let newReadme = Buffer.from(readme.data.content, "base64").toString("ascii");
    markers.forEach((m) => {
      const movieString = m.split(".")[0];

      const movie = movieString === "favourite" ? favourite : recent;
      const prop = m.split(".")[1];
      const value = movie[prop];
      const isLink = m.endsWith(".link");
      const regex = new RegExp(
        `<!-{1,3}\\s*${m}:start${isLink ? ' text=".*"' : ""}\\s*-{1,3}>.*<!-{1,3}\\s*${m}:end\\s*-{1,3}>`,
        "sgi"
      );

      const match = newReadme.match(regex) ?? [""];
      let text = isLink ? (match[0].match(/\".*\"/) ?? [""])[0].replace(/\"/g, "") : "";
      if (text.endsWith(".title")) text = movie.title;

      newReadme = newReadme
        .replace(/\\/g, "")
        .replace(
          regex,
          `<!--${m}:start${isLink ? ` text="${text === movie.title ? `${movieString}.title` : text}"` : ""}-->${
            isLink
              ? `[${text}](${value} 'imdb page')`
              : m === "common.timestamp"
              ? `${new Date().getDate()} ${new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()}`.toLowerCase()
              : value
          }<!--${m}:end-->`
        );
    });

    await kit.repos.createOrUpdateFileContents({
      owner: "matievisthekat",
      repo: "matievisthekat",
      path: "README.md",
      sha: readme.data.sha,
      message: "update movies",
      committer: {
        name: "GitHub Actions",
        email: "41898282+github-actions[bot]@users.noreply.github.com",
      },
      content: Buffer.from(newReadme).toString(
        "base64"
      ),
    });
  });
});
