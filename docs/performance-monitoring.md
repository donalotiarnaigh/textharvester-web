# Performance Monitoring System

## Overview

The performance monitoring system tracks API response times, memory usage, and system metrics to help identify performance bottlenecks and monitor the health of the TextHarvester application.

## Phase 1 Implementation (Completed)

### Features

1. **API Response Time Tracking**: Monitors all OpenAI and Anthropic API calls
2. **Memory Usage Monitoring**: Tracks memory deltas for each API call
3. **Error Tracking**: Records failed API calls with error details
4. **Performance Statistics**: Calculates averages, min/max response times, success rates
5. **Provider Comparison**: Compares performance between different AI providers and models
6. **Real-time Metrics**: Provides live performance data via API endpoints

### API Endpoints

#### GET `/api/performance/stats`
Returns performance statistics for all providers and models.

**Query Parameters:**
- `provider` (optional): Filter by provider (openai, anthropic)
- `model` (optional): Filter by specific model

**Response:**
```json
{
  "success": true,
  "stats": {
    "openai-gpt-5": {
      "provider": "openai",
      "model": "gpt-5",
      "totalCalls": 10,
      "successfulCalls": 9,
      "failedCalls": 1,
      "averageResponseTime": 45230,
      "minResponseTime": 32100,
      "maxResponseTime": 68400,
      "successRate": 90,
      "lastCall": "2025-08-22T14:30:00Z"
    }
  }
}
```

#### GET `/api/performance/recent`
Returns recent performance metrics (last N calls).

**Query Parameters:**
- `limit` (optional): Number of recent metrics to return (default: 20)

#### GET `/api/performance/summary`
Returns a comprehensive performance summary with provider comparisons.

#### GET `/api/performance/system`
Returns current system metrics (memory, CPU, uptime).

#### GET `/api/performance/dashboard`
Returns combined dashboard data for monitoring interfaces.

#### POST `/api/performance/clear`
Clears all performance metrics (useful for testing).

### Usage Examples

#### Monitor API Performance in Real-time

```bash
# Get current performance stats
curl http://localhost:3000/api/performance/stats

# Get OpenAI-specific stats
curl "http://localhost:3000/api/performance/stats?provider=openai"

# Get recent metrics
curl "http://localhost:3000/api/performance/recent?limit=10"

# Get performance summary
curl http://localhost:3000/api/performance/summary
```

#### Programmatic Usage

```javascript
const PerformanceTracker = require('./src/utils/performanceTracker');

// Track an API call manually
const result = await PerformanceTracker.trackAPICall(
  'openai',
  'gpt-5', 
  'processImage',
  async () => {
    // Your API call here
    return await apiClient.call();
  },
  { imageSize: 1024000, promptLength: 500 } // metadata
);

// Get current stats
const tracker = PerformanceTracker.getInstance();
const stats = tracker.getStats();
console.log('Performance Stats:', stats);

// Generate summary report
const summary = tracker.generateSummary();
console.log('Summary:', summary);
```

### Performance Metrics Tracked

#### API Call Metrics
- **Response Time**: Time from request start to completion (milliseconds)
- **Memory Delta**: Memory usage change during the API call (bytes)
- **Success/Failure Rate**: Percentage of successful vs failed calls
- **Error Details**: Error messages and types for failed calls
- **Metadata**: Image size, prompt length, model parameters

#### Aggregated Statistics
- **Average Response Time**: Mean response time across all calls
- **Min/Max Response Times**: Fastest and slowest response times
- **Total Calls**: Count of all API calls made
- **Success Rate**: Percentage of successful calls
- **Provider Comparison**: Performance comparison between OpenAI and Anthropic

### Integration

The performance tracking is automatically integrated into:

1. **OpenAI Provider** (`src/utils/modelProviders/openaiProvider.js`)
2. **Anthropic Provider** (`src/utils/modelProviders/anthropicProvider.js`)
3. **Logger System** (`src/utils/logger.js`)

All API calls are automatically wrapped with performance tracking, so no additional code changes are required for basic monitoring.

### Log Output

Performance metrics are logged with structured format:

```
[INFO] [PERF] Starting processImage with openai/gpt-5 (ID: openai-gpt-5-1755875363046)
[INFO] [PERF] processImage completed successfully {
  provider: 'openai',
  model: 'gpt-5', 
  responseTime: '45230ms',
  memoryDelta: '2.42MB',
  trackingId: 'openai-gpt-5-1755875363046'
}
[INFO] [METRICS] API Performance: openai/gpt-5 - 45230ms - success
```

## Expected Results

With this monitoring system, you can now:

1. **Confirm Performance Issues**: Get concrete data on whether GPT-5/Claude-4 are indeed slower
2. **Compare Providers**: See which provider/model combination performs best
3. **Track Trends**: Monitor performance over time
4. **Identify Bottlenecks**: Pinpoint specific performance issues
5. **Make Data-Driven Decisions**: Choose optimal models based on actual performance data

## Next Steps (Future Phases)

1. **Queue Monitoring**: Track file queue performance and throughput
2. **System Resource Monitoring**: Monitor CPU, memory, disk usage
3. **Performance Dashboard**: Web-based real-time monitoring interface
4. **Alerting System**: Notifications for performance degradation
5. **Historical Analytics**: Long-term performance trend analysis

## Testing

Run the performance tracker tests:

```bash
npm test __tests__/performanceTracker.test.js
```

All tests should pass and demonstrate the core functionality of the monitoring system.
