import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { TaskRequestSchema, TaskResponseSchema, StreamMessage, Action } from '@agentbrowser/shared';
import { BrowserDriver } from '../driver/browser.js';
import { Planner } from '../brain/planner.js';

// Configuration
const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '9223', 10),
  HOST: process.env.HOST || '0.0.0.0',
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:8081', 
    'http://10.0.2.2:8081',
    'exp://127.0.0.1:8081',  // Expo development
    'https://agentbrowser.com',
    process.env.WEB_CLIENT_URL || ''  // Allow custom origin from env
  ].filter(Boolean),
  MAX_TASK_DURATION: 300000, // 5 minutes in milliseconds
  SCREENSHOT_INTERVAL: 1000, // 1 second
};

interface Task {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  actions: Action[];
  progress?: string;
  createdAt: number;
  updatedAt: number;
  userAgent?: string;
}

interface TaskExecution {
  abortController: AbortController;
  timeoutId: NodeJS.Timeout;
}

class AgentServer {
  private fastify: FastifyInstance;
  private driver: BrowserDriver;
  private planner: Planner;
  private tasks: Map<string, Task> = new Map();
  private taskExecutions: Map<string, TaskExecution> = new Map();
  private webSocketClients: Set<WebSocket> = new Set();
  private logger: Console;

  constructor() {
    this.fastify = Fastify({ 
      logger: true,
      maxParamLength: 1000,  // Increase maximum parameter length
    });
    this.driver = new BrowserDriver();
    
    // Get API key from environment
    const apiKey = process.env.LLM_KEY;
    if (!apiKey) {
      this.logger.error('LLM_KEY environment variable is required');
      process.exit(1);
    }
    
    this.planner = new Planner(this.driver, apiKey);
    this.logger = console;
    this.initialize();
  }

  private initialize() {
    // Register plugins
    this.fastify.register(cors, { 
      origin: SERVER_CONFIG.CORS_ORIGINS,
      credentials: true,
    });
    this.fastify.register(websocket);

    // Add security headers
    this.fastify.addHook('onSend', async (req, reply) => {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
    });

    // Register routes
    this.registerRoutes();

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  private registerRoutes() {
    // Health check endpoint
    this.fastify.get('/health', async (req, reply) => {
      try {
        // Check if driver is responsive
        await this.driver.getDOM();
        return { 
          status: 'ok', 
          timestamp: Date.now(),
          uptime: process.uptime(),
          tasks: this.tasks.size,
        };
      } catch (error) {
        this.logger.error('Health check failed:', error);
        reply.code(503);
        return { 
          status: 'error', 
          timestamp: Date.now(),
          error: (error as Error).message,
        };
      }
    });

    // Task execution endpoint
    this.fastify.post('/task', async (req, reply) => {
      try {
        // Validate request
        const parsed = TaskRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          const errors = parsed.error.errors.map(err => err.message).join(', ');
          return reply.code(400).send({ 
            error: 'Invalid request parameters', 
            details: errors
          });
        }

        const { prompt, key, voice } = parsed.data;

        // Validate API key
        const apiKey = key || process.env.LLM_KEY;
        if (!apiKey || apiKey.length < 10) {  // Basic validation
          return reply.code(401).send({ error: 'Invalid API key' });
        }

        // Create task
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userAgent = req.headers['user-agent'] as string;
        
        const task: Task = {
          id: taskId,
          status: 'pending',
          actions: [],
          progress: 'Task received',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userAgent,
        };

        this.tasks.set(taskId, task);

        // Execute task asynchronously
        this.executeTask(taskId, prompt, apiKey, voice);

        // Return task response
        const response = TaskResponseSchema.parse({ 
          taskId, 
          status: 'pending' 
        });

        return reply.send(response);
      } catch (error) {
        this.logger.error('Error creating task:', error);
        return reply.code(500).send({ 
          error: 'Internal server error',
          details: (error as Error).message,
        });
      }
    });

    // Get task status
    this.fastify.get('/task/:id', async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const task = this.tasks.get(id);

        if (!task) {
          return reply.code(404).send({ 
            error: 'Task not found',
            taskId: id,
          });
        }

        return {
          id: task.id,
          status: task.status,
          actions: task.actions,
          progress: task.progress,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      } catch (error) {
        this.logger.error('Error fetching task:', error);
        return reply.code(500).send({ 
          error: 'Internal server error',
          details: (error as Error).message,
        });
      }
    });

    // WebSocket stream endpoint
    this.fastify.get('/stream', { websocket: true }, (socket, req) => {
      this.logger.info(`New WebSocket connection from ${req.socket.remoteAddress}`);
      
      // Add client to broadcast set
      this.webSocketClients.add(socket);

      // Initialize screenshot interval
      const interval = setInterval(async () => {
        try {
          const screenshot = await this.driver.screenshot();
          if (screenshot) {
            socket.send(JSON.stringify({ type: 'screenshot', data: screenshot }));
          }
        } catch (error) {
          this.logger.error('Error sending screenshot:', error);
          // Don't close the connection, just log the error
        }
      }, SERVER_CONFIG.SCREENSHOT_INTERVAL);

      // Handle connection close
      socket.on('close', () => {
        this.logger.info('WebSocket connection closed');
        this.webSocketClients.delete(socket);
        clearInterval(interval);
      });

      // Handle socket errors
      socket.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
        this.webSocketClients.delete(socket);
        clearInterval(interval);
      });

      // Send initial connection message
      try {
        socket.send(JSON.stringify({ 
          type: 'status', 
          data: 'Connected to agent server' 
        }));
      } catch (error) {
        this.logger.error('Error sending initial message:', error);
      }
    });
  }

  private async executeTask(taskId: string, prompt: string, apiKey: string, isVoice?: boolean) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      this.abortTask(taskId, 'Task timeout');
    }, SERVER_CONFIG.MAX_TASK_DURATION);

    this.taskExecutions.set(taskId, { abortController, timeoutId });

    try {
      // Update task status
      const task = this.tasks.get(taskId);
      if (!task) return;

      task.status = 'running';
      task.progress = 'Planning actions...';
      task.updatedAt = Date.now();
      this.broadcastTaskStatus(taskId, `Task ${taskId} started - Planning actions...`);

      // Plan actions
      const actions = await this.planner.plan(prompt, apiKey, isVoice);
      task.progress = `Executing ${actions.length} actions...`;
      task.updatedAt = Date.now();
      this.broadcastTaskStatus(taskId, `Executing ${actions.length} actions...`);

      // Execute actions
      for (let i = 0; i < actions.length; i++) {
        // Check if task was aborted
        if (abortController.signal.aborted) {
          task.status = 'failed';
          task.progress = 'Task was aborted';
          task.updatedAt = Date.now();
          this.broadcastTaskStatus(taskId, 'Task was aborted');
          return;
        }

        const action = actions[i];
        await this.driver.execute(action);
        task.actions.push(action);
        
        // Update progress
        const progress = `Action ${i + 1}/${actions.length} completed: ${action.type}`;
        task.progress = progress;
        task.updatedAt = Date.now();
        this.broadcastTaskStatus(taskId, progress);
      }

      // Task completed successfully
      task.status = 'completed';
      task.progress = 'Task completed successfully!';
      task.updatedAt = Date.now();
      this.broadcastTaskStatus(taskId, `Task ${taskId} completed successfully!`);
    } catch (error) {
      this.logger.error(`Error executing task ${taskId}:`, error);
      
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.progress = `Error: ${(error as Error).message}`;
        task.updatedAt = Date.now();
      }
      
      this.broadcastTaskStatus(taskId, `Task ${taskId} failed: ${(error as Error).message}`);
    } finally {
      // Cleanup execution
      const execution = this.taskExecutions.get(taskId);
      if (execution) {
        clearTimeout(execution.timeoutId);
        this.taskExecutions.delete(taskId);
      }
    }
  }

  private broadcastTaskStatus(taskId: string, message: string) {
    const statusMessage: StreamMessage = {
      type: 'status',
      data: message
    };

    // Filter out closed connections
    const validClients: WebSocket[] = [];
    this.webSocketClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(statusMessage));
          validClients.push(client);
        } catch (error) {
          this.logger.error('Error broadcasting to client:', error);
          // Remove closed connection
          this.webSocketClients.delete(client);
        }
      } else {
        // Remove closed connection
        this.webSocketClients.delete(client);
      }
    });

    // Update the set to only include valid clients
    this.webSocketClients.clear();
    validClients.forEach(client => this.webSocketClients.add(client));
  }

  private abortTask(taskId: string, reason: string) {
    const execution = this.taskExecutions.get(taskId);
    if (execution) {
      execution.abortController.abort();
      clearTimeout(execution.timeoutId);
      this.taskExecutions.delete(taskId);
      
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.progress = `Aborted: ${reason}`;
        task.updatedAt = Date.now();
      }
      
      this.broadcastTaskStatus(taskId, `Task ${taskId} was aborted: ${reason}`);
    }
  }

  private async shutdown() {
    this.logger.info('Shutting down server...');
    
    // Cancel all running tasks
    for (const [taskId, execution] of this.taskExecutions) {
      this.abortTask(taskId, 'Server shutting down');
    }
    
    // Close WebSocket connections
    this.webSocketClients.forEach(client => {
      try {
        client.close(1001, 'Server shutting down');
      } catch (error) {
        this.logger.error('Error closing WebSocket:', error);
      }
    });
    
    // Close browser driver
    try {
      await this.driver.close();
    } catch (error) {
      this.logger.error('Error closing browser driver:', error);
    }
    
    // Close Fastify server
    try {
      await this.fastify.close();
    } catch (error) {
      this.logger.error('Error closing server:', error);
    }
    
    this.logger.info('Server shutdown complete');
    process.exit(0);
  }

  public async start() {
    try {
      await this.fastify.listen({ 
        port: SERVER_CONFIG.PORT, 
        host: SERVER_CONFIG.HOST 
      });
      
      this.logger.info(`🚀 Agent server running on http://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}`);
      this.logger.info(`📡 WebSocket available at ws://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}/stream`);
      this.logger.info(`📊 API available at http://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}/task`);
      this.logger.info(`📋 CORS origins: ${SERVER_CONFIG.CORS_ORIGINS.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start the server
const server = new AgentServer();
server.start();

export default server;
