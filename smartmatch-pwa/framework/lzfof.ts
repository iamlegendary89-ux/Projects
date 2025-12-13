#!/usr/bin/env node
/**
 * LZFOF v2.1 - Legendary Zero-Friction Optimization Framework
 * 
 * Universal optimization for: functions, regex, prompts, configs, queries
 * Now with: profiles, lineage tracking, mutation testing, evolution, autofix
 * 
 * Usage:
 *   npx lzfof cycle <file> [--type=...] [--profile=...]   # Full cycle
 *   npx lzfof extract <file> [--type=...]                  # Extract targets
 *   npx lzfof prompt <name> [--type=...]                   # Generate AI prompt
 *   npx lzfof bench <name> [--type=...] [--profile=...]    # Run benchmarks
 *   npx lzfof analyze <name> [--type=...] [--profile=...]  # Analyze results
 *   npx lzfof apply <name>                                 # Apply winner
 *   npx lzfof mutate <name>                                # Generate mutation tests
 *   npx lzfof evolve <name> --generations=N                # Evolution mode
 */

import fs from 'fs';
import path from 'path';
import { getExtractor } from './extractors/index.js';
import { getRunner } from './runners/index.js';
import { getProfile, calculateScore, type ProfileName } from './profiles.js';
import { createMeta, saveMeta, updateMetaScore, analyzeLineage } from './lineage.js';
import { generateMutations, saveMutations } from './mutator.js';
import { applyPatch, saveWinner } from './patcher.js';
import { generateEvolutionPrompt, saveEvolutionHistory, selectElites, createEvolutionVariant } from './evolver.js';
import type { TargetType, ExtractedItem, VariantResult, BenchmarkResult, AnalysisReport } from './types.js';

const VERSION = '2.1.0';

// Parse CLI args
function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const target = args[1] || '';
    const flags: Record<string, string> = {};

    for (const arg of args.slice(2)) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            if (key) flags[key] = value || 'true';
        }
    }

    return {
        command,
        target,
        type: (flags['type'] as TargetType) || 'function',
        profile: (flags['profile'] as ProfileName) || 'balanced',
        generations: parseInt(flags['generations'] || '10', 10),
        flags,
    };
}

function printBanner() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  LZFOF v${VERSION} - Legendary Zero-Friction Optimization Framework    ║
╠══════════════════════════════════════════════════════════════════════╣
║  Types: function | regex | prompt | config | query                   ║
║  Profiles: fastest | simple | balanced | safe                        ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
}

function printUsage() {
    console.log(`
Usage:
  npx tsx framework/lzfof.ts <command> <target> [options]

Commands:
  cycle <file>       🔄 Full optimization cycle (extract → prompt → bench → analyze)
  extract <file>     📦 Extract targets from file
  prompt <name>      📋 Generate AI prompt for variants
  bench <name>       🧪 Run benchmarks on variants
  analyze <name>     📊 Analyze results and pick winner
  apply <name>       ✅ Apply winning variant to original
  mutate <name>      🧬 Generate mutation test cases
  evolve <name>      🧬 Run N-generation evolution

Options:
  --type=<type>      Target type (function, regex, prompt, config, query)
  --profile=<prof>   Optimization profile (fastest, simple, balanced, safe)
  --generations=<N>  Number of evolution generations (default: 10)

Examples:
  npx tsx framework/lzfof.ts cycle scripts/discovery.ts --profile=fastest
  npx tsx framework/lzfof.ts bench cleanWhitespace --profile=simple
  npx tsx framework/lzfof.ts apply getThresholds
  npx tsx framework/lzfof.ts evolve addDays --generations=20
`);
}

// ============= COMMANDS =============

async function cmdExtract(target: string, type: TargetType) {
    console.log(`\n📦 Extracting [${type}] from: ${target}\n`);

    const extractor = getExtractor(type);
    const items = extractor.extract(target);

    if (items.length === 0) {
        console.log(`❌ No ${type} targets found in ${target}`);
        return [];
    }

    console.log('┌────────────────────────────────┬────────┬────────┐');
    console.log('│ Name                           │ Lines  │ Chars  │');
    console.log('├────────────────────────────────┼────────┼────────┤');

    for (const item of items) {
        const lines = item.code.split('\n').length;
        const chars = item.code.length;
        console.log(`│ ${item.name.padEnd(30)} │ ${String(lines).padStart(6)} │ ${String(chars).padStart(6)} │`);
    }

    console.log('└────────────────────────────────┴────────┴────────┘');
    console.log(`\n✅ Found ${items.length} ${type} targets\n`);

    const outputDir = './analysis';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const baseName = path.basename(target, path.extname(target));
    const outputPath = path.join(outputDir, `${baseName}-${type}s.json`);
    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`📄 Saved to: ${outputPath}\n`);

    return items;
}

async function cmdPrompt(name: string, type: TargetType) {
    const analysisFiles = fs.readdirSync('./analysis').filter(f => f.includes(`-${type}s.json`));

    let targetItem: ExtractedItem | null = null;
    for (const file of analysisFiles) {
        const items = JSON.parse(fs.readFileSync(path.join('./analysis', file), 'utf8'));
        const found = items.find((i: ExtractedItem) => i.name === name);
        if (found) { targetItem = found; break; }
    }

    if (!targetItem) {
        console.error(`❌ ${type} "${name}" not found. Run extract first.`);
        return;
    }

    const variantDir = path.join('./variants', name);
    if (!fs.existsSync(variantDir)) fs.mkdirSync(variantDir, { recursive: true });

    // Save original with lineage
    const ext = type === 'prompt' ? '.md' : '.ts';
    const originalPath = path.join(variantDir, `v0-original${ext}`);
    fs.writeFileSync(originalPath, `// ORIGINAL: ${type}\n\n${targetItem.code}`);

    const meta = createMeta({
        origin: null,
        agent: 'original',
        prompt: 'Extracted from source',
        modifications: [],
        generation: 0,
    });
    saveMeta(originalPath, meta);

    const extractor = getExtractor(type);
    const prompt = extractor.generatePrompt(targetItem);

    console.log('\n' + '='.repeat(70));
    console.log(`📋 COPY THIS PROMPT TO YOUR AI:`);
    console.log('='.repeat(70) + '\n');
    console.log(prompt);
    console.log('\n' + '='.repeat(70));
    console.log(`\n📝 NEXT STEPS:`);
    console.log(`   1. Copy the prompt above to your AI`);
    console.log(`   2. Save variants to: variants/${name}/v1${ext}, v2${ext}...`);
    console.log(`   3. Create tests: tests/${name}.test.json`);
    console.log(`   4. Run: npx tsx framework/lzfof.ts bench ${name}\n`);
}

async function cmdBench(name: string, type: TargetType, profileName: ProfileName) {
    const profile = getProfile(profileName);
    console.log(`\n🧪 LZFOF Benchmark [${type}]: ${name}`);
    console.log(`   Profile: ${profile.name} (${profile.description})\n`);

    const runner = getRunner(type);
    const testCases = runner.loadTestCases(name);

    if (testCases.length === 0) {
        console.log(`❌ No test cases found at tests/${name}.test.json`);
        return null;
    }

    console.log(`📋 Loaded ${testCases.length} test cases`);

    const variantDir = path.join('./variants', name);
    if (!fs.existsSync(variantDir)) {
        console.log(`❌ No variants found at ${variantDir}`);
        return null;
    }

    const variantFiles = fs.readdirSync(variantDir)
        .filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.md'))
        .filter(f => !f.endsWith('.meta.json'))
        .map(f => path.join(variantDir, f));

    console.log(`📁 Found ${variantFiles.length} variants\n`);

    const results: VariantResult[] = [];
    const TIMEOUT = 5000;
    const MEMORY_CAP = 100 * 1024 * 1024; // 100MB

    for (const variantPath of variantFiles) {
        process.stdout.write(`  Testing ${path.basename(variantPath)}... `);

        try {
            // Error-resistant execution with timeout
            const timeoutPromise = new Promise<VariantResult>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), TIMEOUT);
            });

            const resultPromise = runner.runVariant(variantPath, name, testCases);
            const result = await Promise.race([resultPromise, timeoutPromise]);

            results.push(result);

            // Update lineage with score
            const passRate = testCases.length > 0 ? result.passed / testCases.length : 0;
            const avgMs = result.metrics['avgDurationMs'] || 0;
            const complexity = (result.errors?.length || 0) + result.failed;
            const score = calculateScore(passRate, avgMs, complexity, profile);

            updateMetaScore(variantPath, score, passRate);

            const status = result.failed === 0 ? '✅' : '❌';
            console.log(`${status} ${result.passed}/${testCases.length} (${avgMs.toFixed(3)}ms, score: ${score.toFixed(2)})`);

        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            console.log(`💥 Error: ${errorMsg}`);
            results.push({
                variant: path.basename(variantPath),
                file: variantPath,
                passed: 0,
                failed: testCases.length,
                errors: [errorMsg],
                metrics: {},
                testResults: [],
            });
        }
    }

    // Find winner based on profile
    const validVariants = results.filter(r => {
        const passRate = testCases.length > 0 ? r.passed / testCases.length : 0;
        return passRate >= profile.constraints.minPassRate;
    });

    let winner: string | null = null;
    if (validVariants.length > 0) {
        const scored = validVariants.map(v => {
            const passRate = testCases.length > 0 ? v.passed / testCases.length : 0;
            const avgMs = v.metrics['avgDurationMs'] || 0;
            const complexity = v.errors.length;
            const score = calculateScore(passRate, avgMs, complexity, profile);
            return { variant: v.variant, score, avgMs };
        }).sort((a, b) => {
            // Primary: score (higher is better)
            // Secondary: avgMs (lower is better) - tiebreaker for equal scores
            if (b.score !== a.score) return b.score - a.score;
            return a.avgMs - b.avgMs;
        });

        winner = scored[0]?.variant || null;
    }

    const benchmark: BenchmarkResult = {
        targetName: name,
        targetType: type,
        runAt: new Date().toISOString(),
        totalTestCases: testCases.length,
        variants: results,
        winner,
        winnerReason: winner ? `Best score with ${profile.name} profile` : 'No valid variants',
    };

    const outputPath = path.join('./analysis', `${name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(benchmark, null, 2));
    console.log(`\n📊 Results saved to ${outputPath}`);

    if (winner) console.log(`\n🏆 WINNER: ${winner}\n`);

    return benchmark;
}

async function cmdAnalyze(name: string, type: TargetType, profileName: ProfileName) {
    const profile = getProfile(profileName);
    const resultsPath = path.join('./analysis', `${name}.json`);

    if (!fs.existsSync(resultsPath)) {
        console.error(`❌ No results found. Run bench first.`);
        return;
    }

    const benchmark: BenchmarkResult = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    // Calculate scores with profile
    const comparison = benchmark.variants.map(v => {
        const passRate = benchmark.totalTestCases > 0 ? v.passed / benchmark.totalTestCases : 0;
        const avgMs = v.metrics['avgDurationMs'] || 0;
        const complexity = v.errors.length + (v.failed || 0);
        const score = calculateScore(passRate, avgMs, complexity, profile);

        return {
            variant: v.variant,
            passRate: `${Math.round(passRate * 100)}%`,
            avgMs: avgMs.toFixed(3),
            complexity,
            score: Math.round(score * 100) / 100,
        };
    }).sort((a, b) => {
        // Primary: score (higher is better)
        // Secondary: avgMs (lower is better) - tiebreaker for equal scores
        if (b.score !== a.score) return b.score - a.score;
        return parseFloat(a.avgMs) - parseFloat(b.avgMs);
    });

    const winner = comparison[0];

    // Generate confidence reasoning
    const reasoning: string[] = [];
    if (winner) {
        if (winner.passRate === '100%') reasoning.push('Passed all tests');
        if (comparison[1] && winner.score > comparison[1].score + 0.1) {
            reasoning.push(`Significantly better (${((winner.score - comparison[1].score) * 100).toFixed(0)}% higher score)`);
        }
        if (winner.complexity === 0) reasoning.push('Zero errors or failures');
        if (parseFloat(winner.avgMs) < 0.01) reasoning.push('Sub-millisecond execution');
    }

    const confidence =
        winner?.passRate === '100%' && reasoning.length >= 2 ? 'HIGH' :
            winner?.passRate === '100%' ? 'MEDIUM' : 'LOW';

    const report: AnalysisReport = {
        targetName: name,
        targetType: type,
        analyzedAt: new Date().toISOString(),
        recommendation: {
            winner: winner?.variant || 'none',
            reason: reasoning.join('; ') || 'Best available option',
            confidence: confidence.toLowerCase() as 'high' | 'medium' | 'low',
            improvements: [],
        },
        comparison: comparison.map(c => ({
            ...c,
            primaryMetric: c.avgMs,
            secondaryMetric: String(c.complexity),
        })),
    };

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log(`📊 LZFOF ANALYSIS [${type}]: ${name}`);
    console.log(`   Profile: ${profile.name}`);
    console.log('='.repeat(60));

    console.log('\n📋 VARIANT COMPARISON:\n');
    console.log('┌──────────────────┬──────────┬──────────┬──────────┬───────┐');
    console.log('│ Variant          │ Pass %   │ Avg ms   │ Errors   │ Score │');
    console.log('├──────────────────┼──────────┼──────────┼──────────┼───────┤');

    for (const c of comparison) {
        console.log(`│ ${c.variant.padEnd(16)} │ ${c.passRate.padStart(8)} │ ${c.avgMs.padStart(8)} │ ${String(c.complexity).padStart(8)} │ ${c.score.toFixed(2).padStart(5)} │`);
    }

    console.log('└──────────────────┴──────────┴──────────┴──────────┴───────┘');

    if (winner) {
        console.log(`\n🏆 WINNER: ${winner.variant}`);
        console.log(`   Confidence: ${confidence}`);
        console.log(`   Reasoning:`);
        for (const r of reasoning) {
            console.log(`     • ${r}`);
        }
        console.log('');
    }

    fs.writeFileSync(path.join('./analysis', `${name}-analysis.json`), JSON.stringify(report, null, 2));

    return report;
}

async function cmdApply(name: string) {
    console.log(`\n✅ Applying winner for: ${name}\n`);

    const analysisPath = path.join('./analysis', `${name}-analysis.json`);
    if (!fs.existsSync(analysisPath)) {
        console.error('❌ Run analyze first');
        return;
    }

    const analysis: AnalysisReport = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    const winnerName = analysis.recommendation.winner;

    if (!winnerName || winnerName === 'none') {
        console.error('❌ No winner found');
        return;
    }

    const variantDir = path.join('./variants', name);
    // Only match .ts files, avoid .meta.json which also starts with variant name
    const winnerFile = fs.readdirSync(variantDir).find(f =>
        f.startsWith(winnerName) && (f.endsWith('.ts') || f.endsWith('.js'))
    );

    if (!winnerFile) {
        console.error(`❌ Winner file not found: ${winnerName}`);
        return;
    }

    const winnerPath = path.join(variantDir, winnerFile);

    // Save to winners directory
    const savedPath = saveWinner(name, winnerPath, analysis as unknown as Record<string, unknown>);
    console.log(`📁 Saved winner to: ${savedPath}`);

    // Find original file from extraction
    const analysisFiles = fs.readdirSync('./analysis').filter(f => f.endsWith('-functions.json'));
    let originalFile: string | null = null;

    for (const file of analysisFiles) {
        const items = JSON.parse(fs.readFileSync(path.join('./analysis', file), 'utf8'));
        const item = items.find((i: ExtractedItem) => i.name === name);
        if (item) {
            originalFile = item.file;
            break;
        }
    }

    if (!originalFile) {
        console.log('⚠️  Could not find original file. Winner saved but not auto-applied.');
        return;
    }

    const result = applyPatch(originalFile, winnerPath, name);

    if (result.success) {
        console.log(`\n✅ APPLIED: ${name}`);
        console.log(`   Original: ${result.originalFile}`);
        console.log(`   Backup: ${result.backupFile}`);
        console.log(`   Lines changed: ${result.linesChanged}`);
    } else {
        console.error(`❌ Failed to apply: ${result.error}`);
    }
}

async function cmdMutate(name: string, type: TargetType) {
    console.log(`\n🧬 Generating mutation tests for: ${name}\n`);

    const runner = getRunner(type);
    const existingCases = runner.loadTestCases(name);

    if (existingCases.length === 0) {
        console.log('⚠️  No existing test cases. Creating from scratch.');
    }

    const mutations = generateMutations(existingCases, type);
    console.log(`   Generated ${mutations.length} mutation test cases`);

    // TODO: Run original to establish expectations
    // For now, save as draft
    saveMutations(name, mutations);
}

async function cmdCycle(target: string, type: TargetType, profileName: ProfileName) {
    console.log(`\n🔄 LZFOF FULL CYCLE`);
    console.log(`   Target: ${target}`);
    console.log(`   Type: ${type}`);
    console.log(`   Profile: ${profileName}`);
    console.log('='.repeat(50) + '\n');

    // Step 1: Extract
    console.log('📦 STEP 1: Extract\n');
    const items = await cmdExtract(target, type);

    if (items.length === 0) {
        console.log('❌ No targets found. Cycle aborted.');
        return;
    }

    console.log(`\n✅ Extracted ${items.length} targets`);
    console.log('   Top candidates for optimization:');

    const sorted = [...items].sort((a, b) => b.code.length - a.code.length);
    for (const item of sorted.slice(0, 5)) {
        const lines = item.code.split('\n').length;
        console.log(`   • ${item.name} (${lines} lines)`);
    }

    console.log('\n📋 STEP 2: Generate Prompts');
    console.log('   Run: npx tsx framework/lzfof.ts prompt <functionName>');
    console.log('   For each function you want to optimize.\n');

    console.log('📝 STEP 3: Create Variants');
    console.log('   Save AI-generated variants to variants/<name>/v1.ts, v2.ts...\n');

    console.log('🧪 STEP 4: Benchmark');
    console.log('   Run: npx tsx framework/lzfof.ts bench <name> --profile=' + profileName + '\n');

    console.log('📊 STEP 5: Analyze');
    console.log('   Run: npx tsx framework/lzfof.ts analyze <name> --profile=' + profileName + '\n');

    console.log('✅ STEP 6: Apply Winner');
    console.log('   Run: npx tsx framework/lzfof.ts apply <name>\n');
}

async function cmdEvolve(name: string, type: TargetType, generations: number) {
    console.log(`\n🧬 EVOLUTION MODE: ${name}`);
    console.log(`   Generations: ${generations}`);
    console.log('='.repeat(50) + '\n');

    const prompt = generateEvolutionPrompt(
        '// Original function code here',
        [{ code: '// Elite 1', score: 0.95, modifications: ['Pattern A'] }],
        1
    );

    console.log('📋 Evolution Prompt Template:');
    console.log(prompt.slice(0, 500) + '...\n');

    console.log('⚠️  Evolution mode requires LLM integration.');
    console.log('   For now, manually run prompts and save variants as gen1-v1.ts, gen1-v2.ts, etc.\n');
}

// ============= MAIN =============

async function main() {
    const { command, target, type, profile, generations } = parseArgs();

    switch (command) {
        case 'cycle':
            if (!target) { console.error('Usage: lzfof cycle <file>'); return; }
            await cmdCycle(target, type, profile);
            break;

        case 'extract':
            if (!target) { console.error('Usage: lzfof extract <file>'); return; }
            await cmdExtract(target, type);
            break;

        case 'prompt':
            if (!target) { console.error('Usage: lzfof prompt <name>'); return; }
            await cmdPrompt(target, type);
            break;

        case 'bench':
            if (!target) { console.error('Usage: lzfof bench <name>'); return; }
            await cmdBench(target, type, profile);
            break;

        case 'analyze':
            if (!target) { console.error('Usage: lzfof analyze <name>'); return; }
            await cmdAnalyze(target, type, profile);
            break;

        case 'apply':
            if (!target) { console.error('Usage: lzfof apply <name>'); return; }
            await cmdApply(target);
            break;

        case 'mutate':
            if (!target) { console.error('Usage: lzfof mutate <name>'); return; }
            await cmdMutate(target, type);
            break;

        case 'evolve':
            if (!target) { console.error('Usage: lzfof evolve <name>'); return; }
            await cmdEvolve(target, type, generations);
            break;

        case '--version':
        case '-v':
            console.log(`LZFOF v${VERSION}`);
            break;

        default:
            printBanner();
            printUsage();
    }
}

main().catch(console.error);
