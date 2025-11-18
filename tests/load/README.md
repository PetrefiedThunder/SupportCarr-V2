# Load Testing

This directory contains load testing scripts for the SupportCarr platform.

## Tools

We use two load testing tools:

1. **k6** - Modern load testing tool
2. **Artillery** - Easy-to-use load testing toolkit

## Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Install Artillery

```bash
npm install -g artillery@latest
```

## Running Tests

### k6 Load Test

```bash
# Run with default settings (localhost:3000)
k6 run k6-load-test.js

# Run against custom URL
BASE_URL=https://api.supportcarr.com/api/v1 k6 run k6-load-test.js

# Run with custom duration
k6 run --duration 10m --vus 100 k6-load-test.js

# Generate HTML report
k6 run --out web-dashboard k6-load-test.js
```

### Artillery Load Test

```bash
# Run with default config
artillery run artillery-config.yaml

# Run with custom target
artillery run --target https://api.supportcarr.com artillery-config.yaml

# Generate report
artillery run --output report.json artillery-config.yaml
artillery report report.json
```

## Test Scenarios

### k6 Tests

1. **Health Check** (30%) - Simple health endpoint checks
2. **Authentication** (30%) - User sign-in flow
3. **Rescue Flow** (40%) - Complete rescue creation and tracking

### Artillery Tests

1. **Health Check Flow** (30%) - System health verification
2. **Authentication Flow** (40%) - Login and profile retrieval
3. **Rescue Creation Flow** (30%) - End-to-end rescue creation

## Performance Targets

- **Response Time**: p95 < 500ms
- **Error Rate**: < 1%
- **Throughput**: 1000 req/sec per node
- **Availability**: 99.9%

## Load Profiles

### Warm-up Phase
- Duration: 2 minutes
- Target: 100 concurrent users

### Sustained Load
- Duration: 5 minutes
- Target: 100-200 concurrent users

### Peak Load
- Duration: 2 minutes
- Target: 200+ concurrent users

## Monitoring During Tests

1. **Application Metrics** (Prometheus):
   ```bash
   kubectl port-forward -n supportcarr svc/prometheus 9090:9090
   ```

2. **Database Metrics**:
   ```bash
   kubectl port-forward -n supportcarr statefulset/mongodb 27017:27017
   ```

3. **API Logs**:
   ```bash
   kubectl logs -f -n supportcarr deployment/api
   ```

## Interpreting Results

### k6 Metrics

- `http_req_duration`: Request duration
- `http_req_failed`: Failed requests rate
- `http_reqs`: Total HTTP requests
- `vus`: Virtual users
- `iterations`: Completed iterations

### Artillery Metrics

- `http.request_rate`: Requests per second
- `http.response_time`: Response times (min, max, median, p95, p99)
- `http.codes.200`: Successful responses
- `errors.*`: Error counts

## Troubleshooting

### High Response Times

1. Check database query performance
2. Review API endpoint optimization
3. Check resource utilization (CPU/Memory)
4. Verify network latency

### High Error Rates

1. Check application logs
2. Verify database connections
3. Check rate limiting settings
4. Review authentication issues

### Resource Exhaustion

1. Scale up replicas: `kubectl scale deployment api --replicas=5`
2. Increase resource limits in deployment
3. Enable horizontal pod autoscaling
4. Optimize database queries

## CI/CD Integration

Load tests can be integrated into CI/CD:

```yaml
# GitHub Actions example
- name: Run load tests
  run: |
    k6 run --quiet tests/load/k6-load-test.js
    artillery run tests/load/artillery-config.yaml
```

## Best Practices

1. Run tests in non-production environment first
2. Gradually increase load
3. Monitor system resources during tests
4. Run tests regularly (weekly/monthly)
5. Keep test data realistic
6. Document baseline performance
7. Compare results over time
