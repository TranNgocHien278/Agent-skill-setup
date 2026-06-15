#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const net = require('net');

const args = process.argv.slice(2);
const command = args[0];

if (command !== 'init') {
  console.log('Usage: npx @ruvnet/agent-skills init');
  process.exit(1);
}

const sourceDir = path.join(__dirname, '../templates');
const destDir = process.cwd();

console.log('====================================================');
console.log(' 🧠 Reusable Agent Skills setup initialized ');
console.log('====================================================');

// Mappings of skills and their repository list
const SKILLS = [
  { name: "Core & TS/JS Coding Principles", repos: ["mattpocock-skills", "superpowers", "google-skills"] },
  { name: "GSAP & Frontend Animations", repos: ["gsap-skills"] },
  { name: "Cybersecurity Standards & Hardening", repos: ["anthropic-cybersecurity-skills"] },
  { name: "Temporal Knowledge Graph Memory", repos: ["graphiti"], needsAI: true, needsDB: "neo4j", needsPython: true },
  { name: "RAG & Vector Data Indexing", repos: ["cocoindex"], needsAI: true, needsDB: "postgres", needsPython: true },
  { name: "Intelligent Memory Layer", repos: ["mem0"], needsAI: true },
  { name: "Swarm Orchestration", repos: ["ruflo"] }
];

const REPO_URLS = {
  "gsap-skills": "https://github.com/greensock/gsap-skills.git",
  "anthropic-cybersecurity-skills": "https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git",
  "cocoindex": "https://github.com/cocoindex-io/cocoindex.git",
  "superpowers": "https://github.com/obra/superpowers.git",
  "google-skills": "https://github.com/google/skills.git",
  "mattpocock-skills": "https://github.com/mattpocock/skills.git",
  "graphiti": "https://github.com/getzep/graphiti.git",
  "ruflo": "https://github.com/ruvnet/ruflo.git",
  "mem0": "https://github.com/mem0ai/mem0.git"
};

// ==========================================
// Native Readline Helpers for Interactive Terminal
// ==========================================
readline.emitKeypressEvents(process.stdin);

function cleanExit() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

function askSecret(query) {
  return new Promise(resolve => {
    process.stdin.resume();
    process.stdout.write(query);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    let input = '';
    
    const onKey = (char, key) => {
      if (key && key.ctrl && key.name === 'c') {
        cleanExit();
      }
      
      if (char === '\r' || char === '\n' || (key && key.name === 'enter')) {
        process.stdin.removeListener('keypress', onKey);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdout.write('\n');
        resolve(input);
        return;
      }
      
      if (key && key.name === 'backspace') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          readline.moveCursor(process.stdout, -1, 0);
          process.stdout.write(' ');
          readline.moveCursor(process.stdout, -1, 0);
        }
      } else if (char && char.length === 1 && char !== '\r' && char !== '\n') {
        input += char;
        process.stdout.write('*');
      }
    };
    
    process.stdin.on('keypress', onKey);
  });
}

function askCheckbox(question, choices, defaults = []) {
  return new Promise(resolve => {
    process.stdin.resume();
    console.log('\n' + question);
    console.log('  (Use Up/Down arrows, Space to toggle, [a] to toggle all, Enter to confirm)');
    
    let index = 0;
    let selected = choices.map((_, i) => defaults.includes(i));
    let isInitial = true;
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    render();
    
    function render() {
      if (!isInitial) {
        readline.cursorTo(process.stdout, 0);
        readline.moveCursor(process.stdout, 0, -choices.length);
      }
      isInitial = false;
      
      for (let i = 0; i < choices.length; i++) {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        const cursor = i === index ? '> ' : '  ';
        const checkbox = selected[i] ? '[✓]' : '[ ]';
        process.stdout.write(`${cursor}${checkbox} ${choices[i]}\n`);
      }
    }
    
    const onKey = (char, key) => {
      if (key && key.ctrl && key.name === 'c') {
        cleanExit();
      }
      
      if (key && key.name === 'up') {
        index = (index - 1 + choices.length) % choices.length;
        render();
      } else if (key && key.name === 'down') {
        index = (index + 1) % choices.length;
        render();
      } else if (char === ' ' || (key && key.name === 'space')) {
        selected[index] = !selected[index];
        render();
      } else if (char === 'a' || char === 'A') {
        const allSelected = selected.every(v => v);
        selected = choices.map(() => !allSelected);
        render();
      } else if (char === '\r' || char === '\n' || (key && key.name === 'enter')) {
        process.stdin.removeListener('keypress', onKey);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        resolve(selected);
      }
    };
    
    process.stdin.on('keypress', onKey);
  });
}

function askSelect(question, choices, defaultIdx = 0) {
  return new Promise(resolve => {
    process.stdin.resume();
    console.log('\n' + question);
    console.log('  (Use Up/Down arrows to move, Enter to select)');
    
    let index = defaultIdx;
    let isInitial = true;
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    render();
    
    function render() {
      if (!isInitial) {
        readline.cursorTo(process.stdout, 0);
        readline.moveCursor(process.stdout, 0, -choices.length);
      }
      isInitial = false;
      
      for (let i = 0; i < choices.length; i++) {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        const cursor = i === index ? '> ' : '  ';
        process.stdout.write(`${cursor}${choices[i]}\n`);
      }
    }
    
    const onKey = (char, key) => {
      if (key && key.ctrl && key.name === 'c') {
        cleanExit();
      }
      
      if (key && key.name === 'up') {
        index = (index - 1 + choices.length) % choices.length;
        render();
      } else if (key && key.name === 'down') {
        index = (index + 1) % choices.length;
        render();
      } else if (char === '\r' || char === '\n' || (key && key.name === 'enter')) {
        process.stdin.removeListener('keypress', onKey);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        resolve(index);
      }
    };
    
    process.stdin.on('keypress', onKey);
  });
}

// Helper to find working python command
function getPythonCommand() {
  const commands = ['python', 'python3', 'py'];
  for (const cmd of commands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

// Check if Python package is installed globally
function checkPythonPackage(pkg) {
  const pythonCmd = getPythonCommand();
  if (!pythonCmd) return false;

  // Try checking with python -m pip first as it's most reliable
  try {
    execSync(`${pythonCmd} -m pip show ${pkg}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    // ignore
  }

  // Fallback to bare pip command
  try {
    execSync(`pip show ${pkg}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    // ignore
  }

  return false;
}

// Helper to copy directory recursively
function copyDirectoryRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    // Skip node_modules inside templates if it exists
    if (file === 'node_modules') continue;

    // Skip copying the root README.md to avoid overwriting user's project documentation
    if (file === 'README.md' && source === sourceDir) continue;

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyDirectoryRecursiveSync(sourcePath, targetPath);
    } else {
      if (fs.existsSync(targetPath)) {
        console.log(`[OVERWRITE] ${file}`);
      } else {
        console.log(`[CREATE] ${file}`);
      }
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// Ping Port Helper
function pingPort(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Wait for port health check helper
async function waitForPort(port, name, timeoutMs = 30000) {
  console.log(`Waiting for ${name} to accept connections on port ${port}...`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await pingPort(port);
    if (ok) {
      console.log(`\x1b[32m[OK] ${name} is ready.\x1b[0m`);
      return true;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`\x1b[33m[WARNING] ${name} startup timed out after 30s. Proceeding...\x1b[0m`);
  return false;
}

// Helper to safely spin up container
function startDockerContainer(name, runCmd) {
  try {
    const list = execSync(`docker ps -a --filter "name=^/${name}$" --format "{{.Names}}"`, { encoding: 'utf8' }).trim();
    if (list === name) {
      console.log(`[INFO] Container ${name} already exists. Starting container...`);
      execSync(`docker start ${name}`, { stdio: 'ignore' });
    } else {
      console.log(`[DOCKER] Running new container ${name}...`);
      execSync(runCmd, { stdio: 'ignore' });
    }
    return true;
  } catch (e) {
    console.log(`\x1b[31m[ERROR] Failed to start Docker container ${name}: ${e.message}\x1b[0m`);
    return false;
  }
}

// Run Main Flow
async function main() {
  try {
    // ----------------------------------------
    // Step 1: Skill Selection
    // ----------------------------------------
    const skillOptions = SKILLS.map(s => s.name);
    const skillSelections = await askCheckbox('Step 1: Select Skill Packages to install:', skillOptions, [0, 1, 2, 3, 4, 5, 6]);
    
    const selectedSkills = SKILLS.filter((_, idx) => skillSelections[idx]);
    if (selectedSkills.length === 0) {
      console.log('\x1b[33mNo skills selected. Exiting setup.\x1b[0m');
      process.exit(0);
    }

    const needsAI = selectedSkills.some(s => s.needsAI);
    const needsNeo4j = selectedSkills.some(s => s.needsDB === 'neo4j');
    const needsPostgres = selectedSkills.some(s => s.needsDB === 'postgres');
    const needsPython = selectedSkills.some(s => s.needsPython);

    // ----------------------------------------
    // Step 2: AI Provider & API Keys
    // ----------------------------------------
    let aiProvider = 'OpenAI';
    let openaiApiKey = '';
    let mem0ApiKey = '';

    if (needsAI) {
      console.log('\nStep 2: AI Credentials Setup');
      const providerIndex = await askSelect('Select AI Provider for Memory/RAG pipelines:', [
        'OpenAI (Default)',
        'Anthropic',
        'Gemini',
        'Custom / Local'
      ]);
      const providers = ['OpenAI', 'Anthropic', 'Gemini', 'Custom'];
      aiProvider = providers[providerIndex];

      if (aiProvider === 'OpenAI') {
        while (true) {
          openaiApiKey = await askSecret('Enter OpenAI API Key (leave empty to skip): ');
          if (openaiApiKey && !openaiApiKey.startsWith('sk-')) {
            console.log('\x1b[33m[WARNING] OpenAI API Key usually starts with "sk-".\x1b[0m');
            const handleWarn = await askSelect('How would you like to proceed?', [
              'Re-enter API Key (Recommended)',
              'Proceed with this key anyway',
              'Skip entering API Key'
            ]);
            if (handleWarn === 0) continue;
            if (handleWarn === 2) openaiApiKey = '';
          }
          break;
        }
      }

      // Check if Mem0 selected
      const selectedMem0 = selectedSkills.some(s => s.name === 'Intelligent Memory Layer');
      if (selectedMem0) {
        mem0ApiKey = await askSecret('Enter Mem0 API Key (leave empty to skip/use self-hosted): ');
      }
    }

    // ----------------------------------------
    // Step 3: Python Environment Check
    // ----------------------------------------
    let pythonInstallMode = 'skip'; // skip, venv, global
    if (needsPython) {
      console.log('\nStep 3: Python Dependencies Check');
      const hasGraphiti = checkPythonPackage('graphiti-core');
      const hasCocoIndex = checkPythonPackage('cocoindex');

      if (hasGraphiti && hasCocoIndex) {
        console.log('\x1b[32m[INFO] Python packages (graphiti-core, cocoindex) are already installed globally.\x1b[0m');
      } else {
        console.log('\x1b[33m[INFO] Required Python packages (graphiti-core or cocoindex) are missing.\x1b[0m');
        const pyChoiceIdx = await askSelect('How would you like to install them?', [
          'Create a Python virtual environment (.venv) and install dependencies there (Recommended)',
          'Install globally on your system (requires pip global access)',
          'Skip installing Python packages now (install manually later)'
        ]);
        if (pyChoiceIdx === 0) pythonInstallMode = 'venv';
        if (pyChoiceIdx === 1) pythonInstallMode = 'global';
      }
    }

    // ----------------------------------------
    // Step 4: Database & Docker Settings
    // ----------------------------------------
    let runDocker = false;
    let neo4jUri = 'bolt://localhost:7687';
    let neo4jUser = 'neo4j';
    let neo4jPassword = 'your_neo4j_password_here';
    let postgresUrl = 'postgresql://postgres:postgres@localhost:5432/cocoindex';

    if (needsNeo4j || needsPostgres) {
      console.log('\nStep 4: Database Settings');
      const dockerChoiceIdx = await askSelect('Do you want to automatically spin up a local Neo4j/PostgreSql database container using Docker?', [
        'No (Configure connection details and start DB manually later)',
        'Yes (Spin up database containers via Docker now)'
      ]);
      runDocker = (dockerChoiceIdx === 1);

      if (runDocker) {
        // Validate docker is running
        try {
          execSync('docker info', { stdio: 'ignore' });
        } catch (e) {
          console.log('\x1b[31m[ERROR] Docker is not running. Falling back to manual configuration...\x1b[0m');
          runDocker = false;
        }
      }

      if (needsNeo4j) {
        console.log('\n[Neo4j Settings]');
        const customUri = await askQuestion('Neo4j URI (default: bolt://localhost:7687): ');
        if (customUri.trim()) neo4jUri = customUri.trim();
        const customUser = await askQuestion('Neo4j Username (default: neo4j): ');
        if (customUser.trim()) neo4jUser = customUser.trim();
        const customPassword = await askSecret('Neo4j Password (leave empty for default): ');
        if (customPassword.trim()) neo4jPassword = customPassword.trim();
      }

      if (needsPostgres) {
        console.log('\n[PostgreSQL Settings]');
        const customPostgres = await askQuestion('PostgreSQL Database URL (default: postgresql://postgres:postgres@localhost:5432/cocoindex): ');
        if (customPostgres.trim()) postgresUrl = customPostgres.trim();
      }
    }

    // ----------------------------------------
    // Step 5: Confirmation & Execution
    // ----------------------------------------
    console.log('\n====================================================');
    console.log(' Setup Summary');
    console.log('====================================================');
    console.log('Skills to Install:', selectedSkills.map(s => s.name).join(', '));
    if (needsAI) {
      console.log('AI Provider:', aiProvider);
      console.log('OpenAI API Key:', openaiApiKey ? '[Provided]' : '[Not Provided/Skipped]');
    }
    if (needsPython) {
      console.log('Python Libraries:', pythonInstallMode === 'venv' ? 'New .venv environment' : (pythonInstallMode === 'global' ? 'Install globally' : 'Skip/Manual'));
    }
    if (needsNeo4j || needsPostgres) {
      console.log('Docker Database Spinup:', runDocker ? 'Enabled' : 'Disabled');
    }
    console.log('====================================================');

    const proceedChoice = await askSelect('Proceed with installation?', [
      'Yes, start the installation (Recommended)',
      'No, abort setup'
    ]);

    if (proceedChoice === 1) {
      console.log('\nSetup aborted. No changes were made.');
      process.exit(0);
    }

    // --- Start Execution ---
    console.log('\nCopying template files...');
    copyDirectoryRecursiveSync(sourceDir, destDir);
    console.log('Files copied successfully.');

    // Write .env config
    const envExamplePath = path.join(sourceDir, 'tooling/config/.env.example');
    let envContent = '';
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
      envContent = envContent.replace('your_neo4j_password_here', neo4jPassword);
      envContent = envContent.replace('bolt://localhost:7687', neo4jUri);
      envContent = envContent.replace('neo4j', neo4jUser);
      envContent = envContent.replace('your_openai_api_key_here', openaiApiKey || 'your_openai_api_key_here');
      envContent = envContent.replace('postgresql://postgres:postgres@localhost:5432/cocoindex', postgresUrl);
      if (mem0ApiKey) {
        envContent = envContent.replace('your_mem0_api_key_here', mem0ApiKey);
      }
    } else {
      envContent = `# Generated Environment Config
NEO4J_URI=${neo4jUri}
NEO4J_USER=${neo4jUser}
NEO4J_PASSWORD=${neo4jPassword}
OPENAI_API_KEY=${openaiApiKey}
COCOINDEX_DATABASE_URL=${postgresUrl}
MEM0_API_KEY=${mem0ApiKey}
MEM0_HOST=http://localhost:8888
`;
    }

    const configDir = path.join(destDir, 'tooling/config');
    fs.writeFileSync(path.join(configDir, '.env'), envContent, 'utf8');
    console.log('\x1b[32m[OK] Created tooling/config/.env configuration file.\x1b[0m');

    // Run git clones
    console.log('\nCloning skill repositories...');
    const githubDir = path.join(destDir, 'tooling/sources/github');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }

    for (const skill of selectedSkills) {
      for (const repo of skill.repos) {
        const destPath = path.join(githubDir, repo);
        const url = REPO_URLS[repo];
        if (fs.existsSync(destPath)) {
          console.log(`[SKIP] ${repo} - already exists at tooling/sources/github/${repo}`);
        } else {
          console.log(`[CLONE] ${repo} ...`);
          try {
            execSync(`git clone --depth 1 ${url} "${destPath}"`, { stdio: 'inherit' });
          } catch (e) {
            console.log(`\x1b[31m[ERROR] Failed to clone repository ${repo}\x1b[0m`);
          }
        }
      }
    }

    // Install node dependencies in tooling/config/
    if (fs.existsSync(path.join(configDir, 'package.json'))) {
      console.log('\nInstalling Node.js dependencies in tooling/config/...');
      execSync('npm install', { stdio: 'inherit', cwd: configDir });
    }

    // Install Python dependencies
    if (needsPython) {
      const pythonCmd = getPythonCommand();
      if (!pythonCmd) {
        console.log('\x1b[31m[ERROR] Python is not installed or not in system PATH. Cannot install Python dependencies.\x1b[0m');
        console.log('Please install Python and ensure it is added to your PATH, then install dependencies manually.');
        const skipChoice = await askSelect('How would you like to proceed?', [
          'Skip Python dependencies and continue setup (Recommended)',
          'Abort setup'
        ]);
        if (skipChoice === 1) {
          process.exit(1);
        }
      } else {
        if (pythonInstallMode === 'venv') {
          const venvDir = path.join(destDir, '.venv');
          console.log(`\nCreating Python virtual environment (.venv) at ${venvDir} using ${pythonCmd}...`);
          try {
            execSync(`${pythonCmd} -m venv .venv`, { stdio: 'inherit', cwd: destDir });
            const pipPath = process.platform === 'win32'
              ? path.join(venvDir, 'Scripts', 'pip.exe')
              : path.join(venvDir, 'bin', 'pip');
            console.log('Installing dependencies inside the virtual environment...');
            execSync(`"${pipPath}" install graphiti-core "cocoindex[embeddings]"`, { stdio: 'inherit' });
          } catch (e) {
            console.log(`\x1b[31m[ERROR] Failed to install dependencies in virtual environment: ${e.message}\x1b[0m`);
            const skipChoice = await askSelect('How would you like to proceed?', [
              'Skip Python dependencies and continue setup',
              'Abort setup'
            ]);
            if (skipChoice === 1) {
              process.exit(1);
            }
          }
        } else if (pythonInstallMode === 'global') {
          console.log('\nInstalling Python dependencies globally...');
          let pipInstalled = false;
          
          // Test if pip module is available
          try {
            execSync(`${pythonCmd} -m pip --version`, { stdio: 'ignore' });
            pipInstalled = true;
          } catch (e) {
            // Check if bare pip works
            try {
              execSync('pip --version', { stdio: 'ignore' });
              pipInstalled = true;
            } catch (e2) {
              // ignore
            }
          }

          if (!pipInstalled) {
            console.log('\x1b[33m[INFO] pip is not installed. Attempting to bootstrap pip using ensurepip...\x1b[0m');
            try {
              execSync(`${pythonCmd} -m ensurepip --default-pip`, { stdio: 'inherit' });
              pipInstalled = true;
            } catch (e) {
              console.log('\x1b[31m[ERROR] Failed to bootstrap pip using ensurepip.\x1b[0m');
            }
          }

          if (pipInstalled) {
            try {
              console.log('Installing graphiti-core and cocoindex...');
              // Try running through python -m pip first (recommended & handles PATH issues better)
              try {
                execSync(`${pythonCmd} -m pip install graphiti-core "cocoindex[embeddings]"`, { stdio: 'inherit' });
              } catch (e) {
                // Fallback to bare pip command
                execSync('pip install graphiti-core "cocoindex[embeddings]"', { stdio: 'inherit' });
              }
              console.log('\x1b[32m[OK] Python dependencies installed globally.\x1b[0m');
            } catch (e) {
              console.log(`\x1b[31m[ERROR] Failed to install Python dependencies globally: ${e.message}\x1b[0m`);
              const skipChoice = await askSelect('How would you like to proceed?', [
                'Skip Python dependencies and continue setup',
                'Abort setup'
              ]);
              if (skipChoice === 1) {
                process.exit(1);
              }
            }
          } else {
            console.log('\x1b[31m[ERROR] Could not locate or install pip. Cannot perform global install.\x1b[0m');
            const skipChoice = await askSelect('How would you like to proceed?', [
              'Skip Python dependencies and continue setup',
              'Abort setup'
            ]);
            if (skipChoice === 1) {
              process.exit(1);
            }
          }
        }
      }
    }

    // Spin up Docker databases if requested
    if (runDocker) {
      console.log('\nSpinning up database containers...');
      if (needsNeo4j) {
        startDockerContainer('neo4j', `docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=${neo4jUser}/${neo4jPassword} neo4j`);
      }
      if (needsPostgres) {
        startDockerContainer('postgres', `docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16`);
      }

      // Check ports connection
      console.log('');
      if (needsNeo4j) {
        await waitForPort(7687, 'Neo4j Bolt');
      }
      if (needsPostgres) {
        await waitForPort(5432, 'Postgres (pgvector)');
      }
    }

    // ----------------------------------------
    // Step 6: Dynamic Post-Install Guide
    // ----------------------------------------
    console.log('\n====================================================');
    console.log(' 🎉 Agent Skills Initialization Complete! ');
    console.log('====================================================');
    console.log('\nNext Steps:');
    console.log('1. Read CLAUDE.md to view baseline agent execution guidelines.');
    console.log('2. Check tooling/skills/REGISTRY.md to view your active skills.');
    
    if (pythonInstallMode === 'venv') {
      console.log('\n[Python Virtual Environment]');
      if (process.platform === 'win32') {
        console.log('  Activate venv: .\\.venv\\Scripts\\activate');
      } else {
        console.log('  Activate venv: source .venv/bin/activate');
      }
    }

    if (needsNeo4j && !runDocker) {
      console.log('\n[Neo4j Manual Start]');
      console.log('  docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/your_password neo4j');
    }
    if (needsPostgres && !runDocker) {
      console.log('\n[Postgres pgvector Manual Start]');
      console.log('  docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16');
    }
    
    console.log('\nAll done! Have fun building your Agent skills!\n');

  } catch (err) {
    console.error('\nInitialization failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
