import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function killPort(port) {
  try {
    const command = process.platform === 'win32'
      ? `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`
      : `lsof -ti:${port} | xargs kill -9`;

    await execAsync(command);
    console.log(`✅ Killed process on port ${port}`);
  } catch (error) {
    console.log(`ℹ️  No process running on port ${port}`);
  }
}

const port = process.argv[2] || 5000;
killPort(port).then(() => process.exit(0));
