# AgentBrowser Example Tasks

## Basic Navigation

### Search Tasks
```
"Go to google.com and search for artificial intelligence"
"Navigate to bing.com and search for weather forecast"
"Open duckduckgo.com and search for best restaurants nearby"
```

### Direct Navigation
```
"Go to wikipedia.org"
"Navigate to github.com"
"Open youtube.com"
```

## E-commerce

### Product Search
```
"Go to amazon.com and search for wireless headphones"
"Navigate to ebay.com and search for vintage watches"
"Open etsy.com and search for handmade jewelry"
```

### Price Comparison
```
"Search for iPhone 15 on amazon.com and show me the price"
"Find the cheapest laptop on newegg.com"
```

## Social Media

### Content Discovery
```
"Go to youtube.com and search for cooking tutorials"
"Navigate to reddit.com and search for programming tips"
"Open twitter.com and search for AI news"
```

## Research

### Information Gathering
```
"Go to wikipedia.org and search for quantum computing"
"Navigate to arxiv.org and search for machine learning papers"
"Open scholar.google.com and search for climate change research"
```

### News
```
"Go to news.google.com and search for technology news"
"Navigate to bbc.com and find latest world news"
```

## Productivity

### Email
```
"Go to gmail.com and open my inbox"
"Navigate to outlook.com and check for new messages"
```

### Calendar
```
"Go to calendar.google.com and show today's events"
```

### Notes
```
"Go to notion.so and create a new page"
"Navigate to evernote.com and search my notes"
```

## Entertainment

### Streaming
```
"Go to netflix.com and search for action movies"
"Navigate to spotify.com and search for jazz music"
"Open twitch.tv and find gaming streams"
```

### Gaming
```
"Go to steam.com and search for indie games"
"Navigate to itch.io and browse new releases"
```

## Education

### Learning Platforms
```
"Go to coursera.org and search for data science courses"
"Navigate to udemy.com and find Python tutorials"
"Open khanacademy.org and search for math lessons"
```

### Documentation
```
"Go to developer.mozilla.org and search for JavaScript Array methods"
"Navigate to docs.python.org and find string formatting"
```

## Advanced Multi-Step Tasks

### Research Workflow
```
"Go to google.com, search for 'best programming languages 2024', 
click the first result, scroll down to see the list"
```

### Shopping Workflow
```
"Go to amazon.com, search for 'mechanical keyboard', 
filter by 4+ stars, sort by price low to high"
```

### Content Creation
```
"Go to canva.com, create a new design, 
search for 'social media post' templates"
```

## Voice Command Examples

Press "Voice" button and speak:

- "Search for cats on Google"
- "Go to YouTube and find cooking videos"
- "Navigate to Amazon and search for books"
- "Open Wikipedia and search for Albert Einstein"

## Complex Automation Examples

### Data Collection
```
"Go to weather.com, search for New York weather, 
take note of temperature and conditions"
```

### Form Filling
```
"Go to example.com/contact, fill in name field with 'John Doe', 
fill email with 'john@example.com', click submit"
```

### Comparison Shopping
```
"Search for 'wireless mouse' on amazon.com, 
note the top 3 prices, then search the same on ebay.com"
```

## API Integration Examples

### Using cURL
```bash
# Execute a task
curl -X POST http://localhost:9223/task \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Go to google.com and search for AI", "key": "sk-..."}'

# Check task status
curl http://localhost:9223/task/task_1234567890

# Health check
curl http://localhost:9223/health
```

### Using JavaScript
```javascript
// Execute task
const response = await fetch('http://localhost:9223/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Go to github.com and search for react',
    key: 'sk-...'
  })
});
const { taskId } = await response.json();

// Check status
const status = await fetch(`http://localhost:9223/task/${taskId}`);
const task = await status.json();
console.log(task.status, task.actions);
```

### WebSocket Streaming
```javascript
const ws = new WebSocket('ws://localhost:9223/stream');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'screenshot') {
    // Display base64 screenshot
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${message.data}`;
    document.body.appendChild(img);
  }
};
```

## Custom Action Sequences

### Manual Action Execution
```typescript
// In apps/agent/src/node/host.ts
const actions = [
  { type: 'nav', url: 'https://google.com' },
  { type: 'wait', ms: 1000 },
  { type: 'click', x: 360, y: 400 },
  { type: 'type', text: 'hello world' },
  { type: 'wait', ms: 500 },
  { type: 'click', x: 360, y: 500 }
];

for (const action of actions) {
  await driver.execute(action);
}
```

## Tips for Better Results

1. **Be Specific**: "Search for red Nike shoes size 10" vs "Find shoes"
2. **Break Down Complex Tasks**: Split into multiple prompts
3. **Use Wait Times**: Allow pages to load between actions
4. **Verify Results**: Check task status via API
5. **Handle Errors**: Implement retry logic for failed tasks

## Limitations

- Cannot handle CAPTCHAs or authentication
- Limited to visible viewport (720×1280)
- No file upload/download support (yet)
- JavaScript-heavy sites may require longer wait times
- Rate limiting may apply for rapid requests

## Best Practices

1. **Test Simple Tasks First**: Start with basic navigation
2. **Monitor WebSocket Stream**: Watch real-time execution
3. **Use Voice for Quick Commands**: Faster than typing
4. **Save Successful Prompts**: Build a library of working tasks
5. **Adjust Timeouts**: Increase wait times for slow sites

## Troubleshooting Tasks

### Task Fails to Execute
- Check agent logs for errors
- Verify URL is accessible
- Increase wait times between actions
- Simplify the prompt

### Wrong Element Clicked
- LLM may misidentify coordinates
- Use more specific descriptions
- Provide visual context in prompt
- Manually specify coordinates if needed

### Page Doesn't Load
- Check internet connection
- Verify URL is correct
- Increase navigation timeout
- Try alternative URL format
