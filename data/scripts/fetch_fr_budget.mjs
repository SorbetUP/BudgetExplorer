#!/usr/bin/env node
import { run } from '../src/index.js';
function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const [k, v] = a.slice(2).split('=');
            if (v !== undefined)
                args[k] = v;
            else if (i + 1 < argv.length && !argv[i + 1].startsWith('--'))
                args[k] = argv[++i];
            else
                args[k] = true;
        }
    }
    return args;
}
async function main() {
    const args = parseArgs(process.argv);
    const year = Number(args.year ?? 2025);
    const out = String(args.out ?? 'public/data');
    const domain = String(args.domain ?? 'https://data.economie.gouv.fr');
    const { outputs } = await run({ year, outDir: out, domain });
    console.log('Generated:', outputs);
}
main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
