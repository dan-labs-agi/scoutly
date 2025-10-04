import { chromium, Browser, Page, BrowserContext, devices } from 'playwright';
import type { Action } from '@agentbrowser/shared';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Configuration
const BROWSER_CONFIG = {
  HEADLESS: process.env.BROWSER_HEADLESS !== 'false',
  VIEWPORT: { 
    width: 720, 
    height: 1280 
  },
  USER_AGENT: 'AgentBrowser-Mobile/1.0',
  TIMEOUT: 30000, // 30 seconds
  MAX_CONTENT_LENGTH: 32768, // 32KB
  TEMP_DIR: process.env.TEMP_DIR || os.tmpdir(),
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

export class BrowserDriver {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly logger: Console;

  constructor() {
    this.logger = console;
  }

  async init(): Promise<void> {
    if (this.browser) return;

    try {
      // Launch browser with optimized settings
      this.browser = await chromium.launch({
        headless: BROWSER_CONFIG.HEADLESS,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
        ],
      });

      // Create context with mobile emulation
      this.context = await this.browser.newContext({
        ...devices['Pixel 5'], // Mobile device emulation
        viewport: BROWSER_CONFIG.VIEWPORT,
        userAgent: BROWSER_CONFIG.USER_AGENT,
        extraHTTPHeaders: {
          'User-Agent': BROWSER_CONFIG.USER_AGENT,
        },
        // Add extra security headers
        bypassCSP: true,
        ignoreHTTPSErrors: true,
      });

      // Create new page
      this.page = await this.context.newPage();
      
      // Set default timeout
      if (this.page) {
        this.page.setDefaultTimeout(BROWSER_CONFIG.TIMEOUT);
        this.page.setDefaultNavigationTimeout(BROWSER_CONFIG.TIMEOUT);
      }

      // Navigate to default page
      await this.page.goto('https://www.google.com', { 
        waitUntil: 'networkidle', 
        timeout: BROWSER_CONFIG.TIMEOUT 
      });

      this.logger.info('Browser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize browser:', error);
      throw new Error(`Browser initialization failed: ${(error as Error).message}`);
    }
  }

  async execute(action: Action, retryCount = 0): Promise<void> {
    await this.init();
    
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      switch (action.type) {
        case 'click':
          await this.executeClick(action.x, action.y);
          break;
        case 'type':
          await this.executeType(action.text);
          break;
        case 'scroll':
          await this.executeScroll(action.dx, action.dy);
          break;
        case 'nav':
          await this.executeNav(action.url);
          break;
        case 'wait':
          await this.executeWait(action.ms);
          break;
        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }
    } catch (error) {
      this.logger.error(`Error executing action ${action.type}:`, error);
      
      // Retry logic for network-related errors
      if (retryCount < BROWSER_CONFIG.MAX_RETRIES && this.shouldRetry(error)) {
        this.logger.info(`Retrying action ${action.type}, attempt ${retryCount + 1}`);
        await this.page.waitForTimeout(BROWSER_CONFIG.RETRY_DELAY);
        return this.execute(action, retryCount + 1);
      }
      
      throw error;
    }
  }

  private async executeClick(x: number, y: number): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    // Wait for network to be idle before clicking
    await this.page.waitForLoadState('networkidle');
    
    // Validate coordinates are within viewport
    if (x < 0 || x > BROWSER_CONFIG.VIEWPORT.width || 
        y < 0 || y > BROWSER_CONFIG.VIEWPORT.height) {
      this.logger.warn(`Click coordinates (${x}, ${y}) are outside viewport bounds`);
    }
    
    // Perform click
    await this.page.mouse.click(x, y);
    
    // Wait a bit after click for page to respond
    await this.page.waitForTimeout(500);
  }

  private async executeType(text: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    // Focus on the currently active element or first input
    const activeElement = await this.page.evaluate(() => document.activeElement);
    if (!activeElement) {
      // If no element is focused, try to focus on the first input
      await this.page.focus('input, textarea, [contenteditable=true]').catch(() => {});
    }
    
    // Type the text
    await this.page.keyboard.type(text, { delay: 50 }); // Add delay for realistic typing
    
    // Wait after typing
    await this.page.waitForTimeout(300);
  }

  private async executeScroll(dx: number, dy: number): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    // Scroll by the specified amount
    await this.page.mouse.wheel(dx, dy);
    
    // Wait for scroll to complete
    await this.page.waitForTimeout(500);
  }

  private async executeNav(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }
    
    // Navigate to the URL
    await this.page.goto(url, { 
      waitUntil: 'networkidle', 
      timeout: BROWSER_CONFIG.TIMEOUT 
    });
    
    // Wait a bit after navigation
    await this.page.waitForTimeout(1000);
  }

  private async executeWait(ms: number): Promise<void> {
    // Validate wait duration
    if (ms < 0) {
      throw new Error(`Invalid wait duration: ${ms}`);
    }
    
    // Cap maximum wait time to prevent infinite waits
    const maxWait = 30000; // 30 seconds max
    const waitTime = Math.min(ms, maxWait);
    
    await this.page?.waitForTimeout(waitTime);
  }

  async screenshot(): Promise<string> {
    await this.init();
    
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const buffer = await this.page.screenshot({ 
        type: 'jpeg', 
        quality: 50,
        timeout: BROWSER_CONFIG.TIMEOUT 
      });
      
      return buffer.toString('base64');
    } catch (error) {
      this.logger.error('Error taking screenshot:', error);
      throw new Error(`Screenshot failed: ${(error as Error).message}`);
    }
  }

  async getDOM(): Promise<string> {
    await this.init();
    
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const html = await this.page.content();
      return html.slice(0, BROWSER_CONFIG.MAX_CONTENT_LENGTH);
    } catch (error) {
      this.logger.error('Error getting DOM:', error);
      throw new Error(`DOM retrieval failed: ${(error as Error).message}`);
    }
  }

  async transcribeVoice(voiceData: string, apiKey: string): Promise<string> {
    if (!voiceData || !apiKey) {
      throw new Error('Voice data or API key not provided');
    }

    try {
      const client = new OpenAI({ apiKey });
      
      // Create a temporary file from the base64 audio data
      const audioBuffer = Buffer.from(voiceData, 'base64');
      const tempPath = path.join(BROWSER_CONFIG.TEMP_DIR, `voice_${Date.now()}.wav`);
      
      // Write the audio data to a temporary file
      await fs.writeFile(tempPath, audioBuffer);
      
      // Use the OpenAI audio API to transcribe
      const transcription = await client.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1',
        response_format: 'text',  // Return plain text
      });
      
      // Clean up the temp file
      await fs.unlink(tempPath);
      
      return transcription.trim();
    } catch (error) {
      this.logger.error('Error transcribing voice:', error);
      
      // Clean up temp files in case of error
      try {
        const tempFiles = await fs.readdir(BROWSER_CONFIG.TEMP_DIR);
        for (const file of tempFiles) {
          if (file.startsWith('voice_') && file.endsWith('.wav')) {
            const filePath = path.join(BROWSER_CONFIG.TEMP_DIR, file);
            const stat = await fs.stat(filePath);
            // Clean up files older than 1 hour
            if (Date.now() - stat.mtime.getTime() > 3600000) {
              await fs.unlink(filePath);
            }
          }
        }
      } catch (cleanupError) {
        this.logger.error('Error cleaning up temp files:', cleanupError);
      }
      
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.page = null;
      this.logger.info('Browser closed successfully');
    } catch (error) {
      this.logger.error('Error closing browser:', error);
      throw new Error(`Browser shutdown failed: ${(error as Error).message}`);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private shouldRetry(error: unknown): boolean {
    const errorMsg = (error as Error).message.toLowerCase();
    
    // List of transient errors that are worth retrying
    const retryableErrors = [
      'timeout',
      'network error',
      'connection refused',
      'page not found',
      'navigation failed',
      'net::ERR_',
    ];
    
    return retryableErrors.some(err => errorMsg.includes(err));
  }

  // Get browser status for health checks
  async getBrowserStatus(): Promise<{ isHealthy: boolean; pageUrl?: string; error?: string }> {
    try {
      await this.init();
      if (!this.page) {
        return { isHealthy: false, error: 'Page not initialized' };
      }
      
      const url = this.page.url();
      return { isHealthy: true, pageUrl: url };
    } catch (error) {
      return { isHealthy: false, error: (error as Error).message };
    }
  }
}
