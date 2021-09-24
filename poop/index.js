import { Octokit } from "octokit";

if (!process.env.PAT) throw new Error("No environment variable 'PAT'");
const kit = new Octokit({ auth: process.env.PAT });

// TODO: actually implement this...
async function fetchPoops() { // only fetches from the last 24 hours
  return [
    {  }
  ]
}

fetchPoops().then(async ({ length }) => {
  await kit.request("PATCH /user", { bio: `${length} poop${length > 1 ? "s" : ""} in the last 24h` });
})
