async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const [first] = argv;

  // help/version are cheapest — no config load
  if (first === undefined || first === '-h' || first === '-help' || first === '--help' || first === 'help') {
    const { HELP } = await import('./help.js');
    console.log(HELP);
    return 0;
  }
  if (first === '-v' || first === '-version' || first === '--version' || first === 'version') {
    const { version } = await import('./help.js');
    console.log(version());
    return 0;
  }

  const { getConfigPath } = await import('../config.js');
  const configPath = getConfigPath();
  const { parseArgs, flag } = await import('./args.js');

  if (first === '.') {
    const { runZoneAddDot } = await import('../commands/zone.js');
    return runZoneAddDot(configPath);
  }
  if (first === 'new' || first === 'create') {
    const { runNew } = await import('../commands/new.js');
    return runNew(configPath, parseArgs(argv.slice(1)));
  }
  if (first === '-new' || first === '-create') {
    const { runNew } = await import('../commands/new.js');
    return runNew(configPath, parseArgs(argv.slice(1)));
  }
  if (first === 'list' || first === 'ls') {
    const { runList } = await import('../commands/list.js');
    return runList(configPath, parseArgs(argv.slice(1)));
  }
  if (first === 'config' || first === '-config') {
    const { runConfig } = await import('../commands/config.js');
    return runConfig(configPath, parseArgs(argv.slice(1)));
  }

  if (first.startsWith('-')) return dispatchCommand(first, argv.slice(1), configPath);

  // :name shorthand -> hot:name (needs config)
  let token = first;
  if (token.startsWith(':')) {
    const { loadConfig } = await import('../core/registry/store.js');
    const cfg = loadConfig(configPath);
    if (!cfg.hot) { console.error('scaff: no hot zone set. Use scaff -zone add <name> <dir>'); return 1; }
    token = `${cfg.hot}:${token.slice(1)}`;
  }
  // --skip-config / --no-config to jump without running .scaff
  const skipConfig = argv.includes('--skip-config') || argv.includes('--no-config') || argv.includes('--no-auto');
  const bareToken = skipConfig ? token.split(' ')[0] : token; // token is first arg only anyway

  const { runBare } = await import('../commands/path.js');
  const code = await runBare(configPath, bareToken);
  if (code === 0 && !skipConfig) {
    try {
      const { resolveToken } = await import('../core/resolve/index.js');
      const { loadConfig } = await import('../core/registry/store.js');
      const cfg = loadConfig(configPath);
      const projects = resolveToken(cfg, bareToken);
      if (projects.length) {
        const { loadProjectConfig, runProjectConfig } = await import('../core/projectConfig/index.js');
        const pc = loadProjectConfig(projects[0]!.path);
        if (pc?.auto) await runProjectConfig(projects[0]!.path, pc);
      }
    } catch {}
  }
  return code;
}

async function dispatchCommand(command: string, rest: string[], configPath: string): Promise<number> {
  const { parseArgs, flag } = await import('./args.js');
  const args = parseArgs(rest);
  switch (command) {
    case '-setup': {
      const m = await import('../commands/setup.js'); return m.runSetup(args);
    }
    case '-add': {
      const m = await import('../commands/zone.js'); return m.runZoneAddInteractive(configPath, args);
    }
    case '-list':
    case '-ls': {
      const { runList } = await import('../commands/list.js'); return runList(configPath, args);
    }
    case '-find':
    case '-f': {
      const m = await import('../commands/find.js'); return m.runFind(configPath, args);
    }
    case '-open': {
      const { runOpen } = await import('../commands/open.js'); return runOpen(configPath, args);
    }
    case '-zone': {
      const { runZone } = await import('../commands/zone.js'); return runZone(configPath, args);
    }
    case '-alias': {
      const { runAlias } = await import('../commands/alias.js'); return runAlias(args);
    }
    case '-hot': {
      const m = await import('../commands/zone.js'); return m.runZoneHotSet(configPath, args);
    }
    case '-update': {
      const m = await import('../core/update/index.js'); return m.runUpdate(flag(args.options, 'check'));
    }
    default: {
      const { HELP } = await import('./help.js');
      console.error(`scaff: unknown command "${command}".`);
      console.log(HELP);
      return 1;
    }
  }
}

async function maybePromptSetup(configPath: string): Promise<void> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) return;
  const { loadConfig } = await import('../core/registry/store.js');
  const cfg = loadConfig(configPath) as unknown as Record<string, unknown>;
  if (cfg['_setupPrompted']) return;
  try {
    const { detectShell, hasSetupBlock, profilePath } = await import('../core/shells/index.js');
    const shell = detectShell();
    const profile = profilePath(shell);
    if (hasSetupBlock(profile)) { (cfg['_setupPrompted']=true); try{ const {saveConfig}=await import('../core/registry/store.js'); saveConfig(configPath, cfg as never);}catch{} return; }
    const Enquirer = (await import('enquirer')).default as unknown as { Confirm: new(o:unknown)=>{run():Promise<boolean>} };
    const confirm = new Enquirer.Confirm({ name:'setup', message:'Run scaff anywhere — add shell integration? [Y/n]', initial:true });
    const yes = await confirm.run().catch(()=>false);
    (cfg['_setupPrompted']=true);
    try{ const {saveConfig}=await import('../core/registry/store.js'); saveConfig(configPath, cfg as never);}catch{}
    if (yes) {
      const { installSetup } = await import('../core/shells/index.js');
      installSetup(shell, profile);
      console.log(`✔ Shell integration added to ${profile} — restart your shell.`);
    }
  } catch {}
}

main().then(async c=>{
  if(c===0){
    try{
      const { getConfigPath } = await import('../config.js');
      await maybePromptSetup(getConfigPath());
    }catch{}
  }
  process.exitCode=c;
}).catch(async (err:unknown)=>{
  console.error('scaff: unexpected error —',(err as Error).message??err);
  process.exitCode=1;
});
