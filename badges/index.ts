import {parse} from 'https://deno.land/std@0.119.0/encoding/yaml.ts';
import {renderFile} from 'https://deno.land/x/dejs/mod.ts';
import {join, fromFileUrl, dirname} from 'https://deno.land/std/path/mod.ts';
import {StringWriter} from 'https://deno.land/std/io/mod.ts';
import {copy} from 'https://deno.land/std/streams/conversion.ts';
import {ensureFile} from 'https://deno.land/std/fs/ensure_file.ts';

const __dirname = dirname(fromFileUrl(import.meta.url));
const rawYml = Deno.readTextFileSync(join(__dirname, 'badges.yml'));
const badges = parse(rawYml);

renderFile(join(__dirname, 'base.ejs'), {badges}).then(async (reader) => {
  const writer = new StringWriter();
  await copy(reader, writer);

  const filePath = join(__dirname, '../badges.svg');
  await ensureFile(filePath);
  
  const file = await Deno.open(filePath, {write: true});
  await file.write(new TextEncoder().encode(writer.toString()));
  file.close();
});
