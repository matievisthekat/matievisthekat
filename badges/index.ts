import {parse} from 'https://deno.land/std@0.119.0/encoding/yaml.ts';
import {renderFileToString} from 'https://deno.land/x/dejs/mod.ts';
import {join, fromFileUrl, dirname} from 'https://deno.land/std/path/mod.ts';
import {ensureFile} from 'https://deno.land/std/fs/ensure_file.ts';

const __dirname = dirname(fromFileUrl(import.meta.url));
const rawYml = Deno.readTextFileSync(join(__dirname, 'badges.yml'));
const badges = parse(rawYml);

renderFileToString(join(__dirname, 'base.ejs'), {badges}).then(async (html) => {
  const filePath = join(__dirname, '../badges.svg');
  await ensureFile(filePath);
  
  const file = await Deno.open(filePath, {write: true});
  await file.write(new TextEncoder().encode(html));
  file.close();
});
