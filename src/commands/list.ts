import { loadConfig } from '../core/registry/store.js';
import { listProjects } from '../core/resolve/index.js';
import type { ParsedArgs } from '../cli/args.js';
import chalk from 'chalk';
import Enquirer from 'enquirer';

export async function runList(configPath: string, args: ParsedArgs): Promise<number> {
  const config = loadConfig(configPath);
  const query = args.positionals[0];
  let projects = listProjects(config, {});
  if (query) projects = projects.filter(p=>p.name.toLowerCase().includes(query.toLowerCase()));
  if (projects.length===0){ console.log('No projects. Use scaff . or scaff -zone add'); return 0; }
  if (!process.stdout.isTTY) {
    for (const p of projects) console.log(`${p.zone}:${p.name}${p.zone===config.hot?chalk.red(' [hot]'):''} -> ${p.path}`);
    return 0;
  }
  const { AutoComplete } = Enquirer as unknown as { AutoComplete: new(o:unknown)=>{run():Promise<string>} };
  const prompt = new AutoComplete({
    name:'project', message:'pick project', limit:15,
    choices: projects.map(p=>({ name:`${p.zone}:${p.name}`, message:`${p.name} ${p.zone===config.hot?chalk.red('[hot]'):`[${p.zone}]`}`, hint:p.path })),
  });
  const picked = await prompt.run();
  const [zone, name] = picked.split(':');
  const proj = projects.find(p=>p.zone===zone&&p.name===name);
  if (proj) console.log(proj.path);
  return 0;
}
