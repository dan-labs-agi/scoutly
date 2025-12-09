// Zerant Browser - Injected JavaScript Agent
// This script is injected into the WebView to control the browser

export const INJECTED_JAVASCRIPT = `
(function() {
  // Zerant Agent Object
  window.zerantAgent = {
    
    // =========================================
    // Get Page Context
    // =========================================
    getContext: function() {
      return {
        url: window.location.href,
        title: document.title,
        text: document.body.innerText.substring(0, 5000),
        html: document.documentElement.outerHTML.substring(0, 10000),
        timestamp: new Date().toISOString()
      };
    },
    
    // =========================================
    // Execute Browser Action
    // =========================================
    executeAction: function(action) {
      console.log('[Zerant] Executing:', JSON.stringify(action));
      
      try {
        switch(action.type) {
          case 'click':
            this.handleClick(action);
            break;
          case 'fill':
            this.handleFill(action);
            break;
          case 'navigate':
            this.handleNavigate(action);
            break;
          case 'extract':
            this.handleExtract(action);
            break;
          case 'scroll':
            this.handleScroll(action);
            break;
          case 'wait':
            this.handleWait(action);
            break;
          case 'observe':
            this.handleObserve(action);
            break;
          default:
            throw new Error('Unknown action type: ' + action.type);
        }
        
        // Report success
        this.postMessage({
          type: 'action_executed',
          action: action,
          success: true
        });
        
      } catch (err) {
        // Report error
        this.postMessage({
          type: 'action_error',
          action: action,
          success: false,
          error: err.message
        });
      }
    },
    
    // =========================================
    // Action Handlers
    // =========================================
    
    handleClick: function(action) {
      var el = null;
      
      // Try by selector first
      if (action.selector) {
        el = document.querySelector(action.selector);
      }
      
      // Try by text content
      if (!el && action.value) {
        el = this.findElementByText(action.value);
      }
      
      if (el) {
        el.click();
        console.log('[Zerant] Clicked:', action.selector || action.value);
      } else {
        throw new Error('Element not found: ' + (action.selector || action.value));
      }
    },
    
    handleFill: function(action) {
      var inputEl = document.querySelector(action.selector);
      
      if (inputEl) {
        inputEl.value = action.value || '';
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Zerant] Filled:', action.selector, 'with', action.value);
      } else {
        throw new Error('Input not found: ' + action.selector);
      }
    },
    
    handleNavigate: function(action) {
      window.location.href = action.url;
      console.log('[Zerant] Navigating to:', action.url);
    },
    
    handleExtract: function(action) {
      var elements = action.selector 
        ? document.querySelectorAll(action.selector)
        : [document.body];
      
      var extractedData = [];
      elements.forEach(function(el) {
        extractedData.push(el.innerText.trim());
      });
      
      this.postMessage({
        type: 'extraction',
        data: extractedData,
        selector: action.selector,
        count: extractedData.length
      });
      
      console.log('[Zerant] Extracted:', extractedData.length, 'items');
    },
    
    handleScroll: function(action) {
      var amount = action.amount || 500;
      window.scrollBy(0, amount);
      console.log('[Zerant] Scrolled by:', amount);
    },
    
    handleWait: function(action) {
      // Just log - actual waiting handled by React Native
      console.log('[Zerant] Wait requested:', action.reason);
    },
    
    handleObserve: function(action) {
      // Find all interactive elements on the page
      var buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
      var links = document.querySelectorAll('a[href]');
      var inputs = document.querySelectorAll('input, textarea, select');
      
      var observations = {
        buttons: Array.from(buttons).slice(0, 10).map(function(el) {
          return { text: el.innerText || el.value, selector: el.tagName.toLowerCase() };
        }),
        links: Array.from(links).slice(0, 10).map(function(el) {
          return { text: el.innerText, href: el.href };
        }),
        inputs: Array.from(inputs).slice(0, 10).map(function(el) {
          return { name: el.name, type: el.type, placeholder: el.placeholder };
        })
      };
      
      this.postMessage({
        type: 'extraction',
        data: observations,
        subtype: 'observation'
      });
      
      console.log('[Zerant] Observed page elements');
    },
    
    // =========================================
    // Helper Functions
    // =========================================
    
    findElementByText: function(text, tagName) {
      var elements = tagName 
        ? document.querySelectorAll(tagName) 
        : document.querySelectorAll('a, button, span, div, p, h1, h2, h3, h4, h5, h6, li');
      
      var lowerText = text.toLowerCase();
      
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        if (el.innerText && el.innerText.toLowerCase().includes(lowerText)) {
          return el;
        }
      }
      return null;
    },
    
    findClickableByText: function(text) {
      // Priority order: buttons, links, then other elements
      var selectors = [
        'button',
        'a[href]',
        '[role="button"]',
        'input[type="submit"]',
        'input[type="button"]',
        '[onclick]',
        'span',
        'div'
      ];
      
      var lowerText = text.toLowerCase();
      
      for (var i = 0; i < selectors.length; i++) {
        var elements = document.querySelectorAll(selectors[i]);
        for (var j = 0; j < elements.length; j++) {
          var el = elements[j];
          if (el.innerText && el.innerText.toLowerCase().includes(lowerText)) {
            return el;
          }
        }
      }
      return null;
    },
    
    postMessage: function(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      } else {
        console.log('[Zerant] Message (no WebView):', data);
      }
    }
  };
  
  // Signal that agent is ready
  window.zerantAgent.postMessage({
    type: 'agent_ready',
    url: window.location.href,
    title: document.title
  });
  
  console.log('[Zerant] Agent initialized');
  
  true;
})();
`;

// Helper to get page context via injection
export const GET_CONTEXT_SCRIPT = `
(function() {
  var context = window.zerantAgent.getContext();
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'context',
    data: context
  }));
  true;
})();
`;

// Helper to execute action
export const createExecuteActionScript = (action: any): string => {
  return `
(function() {
  window.zerantAgent.executeAction(${JSON.stringify(action)});
  true;
})();
`;
};
