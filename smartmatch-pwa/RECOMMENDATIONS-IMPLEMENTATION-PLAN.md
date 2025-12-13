# Recommendations Implementation Plan
## Based on Workflow Logs Forensic Analysis

**Created:** 2025-12-06  
**Status:** Planning Phase  
**Priority Order:** Critical → High → Medium

---

## 🔴 Critical Priority

### 1. Fix Hero Image Download Timeout

**Current Issue:** 68 seconds to download 9KB image  
**Target:** <5 seconds with timeout at 30 seconds

#### Implementation Tasks:
- [ ] **Add timeout configuration to `discovery.ts`**
  - Add `IMAGE_DOWNLOAD_TIMEOUT_MS` constant (30 seconds)
  - Update `Network.getBinary()` to accept timeout parameter
  - Apply timeout to hero image downloads specifically

- [ ] **Implement retry logic with exponential backoff**
  - Add retry mechanism (max 3 attempts)
  - Exponential backoff: 2s, 4s, 8s
  - Log retry attempts for monitoring

- [ ] **Cache image URLs**
  - Check if image already exists before download
  - Store image URL → file path mapping
  - Skip download if image exists and is valid

- [ ] **Add monitoring**
  - Track image download durations
  - Alert if downloads exceed 10 seconds
  - Log slow downloads for analysis

**Files to Modify:**
- `scripts/discovery.ts` (Network class, saveHeroImage method)
- `scripts/discovery.ts` (CONFIG object)

**Estimated Effort:** 2-3 hours  
**Expected Impact:** Reduce Discovery job time by ~1 minute

---

### 2. Investigate Zero CSE Calls

**Current Issue:** 0 CSE API calls despite 6+ minute runtime  
**Target:** Understand why Phase 1 is being skipped

#### Investigation Tasks:
- [ ] **Verify CSE credentials**
  - Check `.env.local` for `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ID`
  - Verify credentials are valid and not expired
  - Test CSE API directly with credentials

- [ ] **Review Phase 1 logic in `discovery.ts`**
  - Check `runPhase1()` method
  - Verify condition: `if (!Array.isArray(entry.urls[type]) || entry.urls[type].length === 0)`
  - Add logging to understand why Phase 1 is skipped

- [ ] **Review cache logic**
  - Check if URLs are already populated in `phones.json`
  - Verify cache invalidation strategy
  - Determine if cache is too aggressive

- [ ] **Add diagnostic logging**
  - Log when Phase 1 is skipped and why
  - Log CSE credential status at startup
  - Track URL discovery attempts

**Files to Review:**
- `scripts/discovery.ts` (runPhase1 method)
- `data/phones.json` (check URL population)
- `.env.local` (verify credentials)

**Estimated Effort:** 1-2 hours  
**Expected Impact:** Enable new URL discovery if currently blocked

---

## 🟡 High Priority

### 3. Optimize Discovery Performance

**Current Issue:** 368 seconds for cached data (expected ~2-3 minutes)  
**Target:** Reduce to <180 seconds for cached runs

#### Implementation Tasks:
- [ ] **Batch file existence checks**
  - Replace individual `fs.access()` calls with batch operations
  - Use `Promise.all()` for parallel checks
  - Cache file existence results in memory

- [ ] **Cache CDX results more aggressively**
  - Extend CDX cache TTL (currently per-run)
  - Persist CDX cache to disk between runs
  - Share CDX cache across workflow runs

- [ ] **Parallelize archive lookups**
  - Process multiple URLs concurrently (max 2-3 parallel)
  - Use `p-limit` to control concurrency
  - Add timeout per lookup (30 seconds)

- [ ] **Optimize file system operations**
  - Batch directory creation
  - Reduce redundant path operations
  - Cache normalized paths

**Files to Modify:**
- `scripts/discovery.ts` (runPhase3 method, Network class)
- `scripts/discovery.ts` (CDX cache implementation)

**Estimated Effort:** 4-6 hours  
**Expected Impact:** Reduce Discovery time by 50% for cached runs

---

### 4. Reduce Log Verbosity

**Current Issue:** Excessive OpenTelemetry metric definition logs  
**Target:** Clean, actionable logs with appropriate levels

#### Implementation Tasks:
- [ ] **Filter OpenTelemetry noise**
  - Set OpenTelemetry log level to WARN or ERROR only
  - Filter out metric definition logs in CI
  - Keep only actionable telemetry data

- [ ] **Use appropriate log levels**
  - Review all `logger.info()` calls
  - Convert verbose info to debug level
  - Use warn/error for actual issues

- [ ] **Structure logs better**
  - Use structured JSON logging for machine parsing
  - Add log rotation for large files
  - Separate debug logs from production logs

- [ ] **Update workflow logging**
  - Reduce GitHub Actions step verbosity
  - Only log errors and important milestones
  - Use GitHub Actions annotations for visibility

**Files to Modify:**
- `.github/workflows/smartmatch-pipeline.yml` (log level config)
- `scripts/discovery.ts` (logger configuration)
- `scripts/enrichment.ts` (logger configuration)
- `scripts/sync.ts` (logger configuration)

**Estimated Effort:** 2-3 hours  
**Expected Impact:** Cleaner logs, easier debugging, reduced log storage

---

## 🟢 Medium Priority

### 5. Add Metrics Dashboard

**Current Issue:** No visibility into workflow metrics  
**Target:** Real-time monitoring and alerting

#### Implementation Tasks:
- [ ] **Track CSE call counts**
  - Add metric: `discovery.cse_calls_total`
  - Track per-run and cumulative
  - Alert if zero calls for multiple runs

- [ ] **Monitor scrape success rates**
  - Add metric: `discovery.scrape_success_rate`
  - Track success vs failure ratio
  - Alert if success rate drops below 80%

- [ ] **Alert on anomalies**
  - Zero CSE calls for 3+ consecutive runs
  - Scrape success rate < 50%
  - Discovery duration > 10 minutes
  - Image download time > 30 seconds

- [ ] **Create dashboard**
  - Use Grafana (already configured)
  - Create panels for key metrics
  - Add alerting rules

**Files to Create/Modify:**
- `lib/telemetry/telemetry.ts` (add custom metrics)
- `scripts/discovery.ts` (emit metrics)
- `grafana-datasources.yml` (verify configuration)
- Create Grafana dashboard JSON

**Estimated Effort:** 6-8 hours  
**Expected Impact:** Proactive issue detection, better visibility

---

### 6. Improve Error Reporting

**Current Issue:** Generic error messages, no tracking  
**Target:** Actionable errors with context

#### Implementation Tasks:
- [ ] **Better context for "fallback exhausted"**
  - Include URL that failed
  - List all strategies attempted
  - Show date ranges tried
  - Suggest next action (manual review, Archive.org save)

- [ ] **Track URLs that fail consistently**
  - Maintain failure tracking cache
  - Count consecutive failures
  - Flag for manual review after 3 failures

- [ ] **Add manual review queue**
  - Create `data/manual_review_queue.json`
  - Add entries for persistent failures
  - Include failure reason and context
  - Add script to review queue

- [ ] **Enhance error messages**
  - Include phone brand/model in errors
  - Add timestamps and context
  - Suggest remediation steps

**Files to Modify:**
- `scripts/discovery.ts` (error handling, review queue)
- Create `scripts/review-queue.ts` (manual review tool)

**Estimated Effort:** 4-5 hours  
**Expected Impact:** Faster debugging, better issue resolution

---

## Implementation Timeline

### Week 1: Critical Fixes
- **Day 1-2:** Fix hero image timeout (#1)
- **Day 3:** Investigate zero CSE calls (#2)

### Week 2: High Priority
- **Day 1-3:** Optimize Discovery performance (#3)
- **Day 4:** Reduce log verbosity (#4)

### Week 3: Medium Priority
- **Day 1-3:** Add metrics dashboard (#5)
- **Day 4-5:** Improve error reporting (#6)

**Total Estimated Time:** ~20-25 hours

---

## Success Metrics

### Performance Improvements
- [ ] Hero image downloads: <5 seconds (currently 68s)
- [ ] Discovery job duration: <3 minutes for cached runs (currently 6.1m)
- [ ] Log file size: <100KB per run (currently 267KB)

### Reliability Improvements
- [ ] CSE calls: >0 when new phones added
- [ ] Scrape success rate: >90%
- [ ] Zero silent failures

### Observability Improvements
- [ ] Metrics dashboard operational
- [ ] Alerts configured and tested
- [ ] Error tracking implemented

---

## Notes

- All changes should maintain backward compatibility
- Test each change in isolation before combining
- Monitor workflow runs after each change
- Document any new configuration options
- Update README with new features

---

## Related Documents

- `workflow-logs-FORENSIC-ANALYSIS.md` - Original analysis
- `scripts/FORENSIC_ANALYSIS.md` - Scripts code quality analysis
- `.github/workflows/smartmatch-pipeline.yml` - Workflow definition

